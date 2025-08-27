export const contractsArray = [
    {
      name: "CBTC2NFTEscrow Contract",
      description: "This smart contract facilitates secure peer-to-peer exchanges between CBTC (Citrea Bitcoin) and Non-Fungible Tokens (NFTs) on the Citrea zkRollup. It acts as a trustless intermediary, ensuring both parties fulfill their commitments before the exchange is completed. For example, Alice can use this contract to safely trade her CBTC for Bob's unique digital artwork NFT without the risk of either party backing out mid-transaction. The contract holds both assets in escrow until both parties have made their deposits, after which the exchange can be executed, or cancelled if needed, providing a safe and efficient way to swap CBTC for any NFT on Citrea.",
      contract_code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CBTC-to-NFT Escrow Contract
 * @dev P2P transactions using CBTC through escrow for NFTs on Citrea zkRollup.
 */
contract CBTC2NFTEscrow is ReentrancyGuard, Ownable {
    struct EscrowOrder {
        address partyA; // CBTC sender
        address partyB; // NFT holder
        address nftContract;
        uint256 nftTokenId;
        uint256 cbtcAmount; // Amount in CBTC wei
        bool partyADeposited;
        bool partyBDeposited;
        bool executed;
        uint256 createdAt;
        uint256 expiresAt;
    }

    mapping(uint256 => EscrowOrder) public escrowOrders;
    uint256 public nextOrderId;
    uint256 public constant ESCROW_DURATION = 7 days;
    uint256 public feePercentage = 25; // 0.25% fee
    uint256 public constant FEE_DENOMINATOR = 10000;

    event EscrowOrderCreated(
        uint256 indexed orderId,
        address indexed partyA,
        address indexed partyB,
        address nftContract,
        uint256 nftTokenId,
        uint256 cbtcAmount
    );

    event PartyADeposit(uint256 indexed orderId, address indexed partyA, uint256 amount);
    event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
    event EscrowExecuted(uint256 indexed orderId);
    event EscrowCancelled(uint256 indexed orderId);
    event FeeUpdated(uint256 newFeePercentage);

    modifier validContract(address _nftContract) {
        require(_nftContract.code.length > 0, "Invalid NFT contract");
        _;
    }

    modifier onlyParties(uint256 orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(
            msg.sender == order.partyA || msg.sender == order.partyB,
            "Not authorized"
        );
        _;
    }

    modifier notExecuted(uint256 orderId) {
        require(!escrowOrders[orderId].executed, "Already executed");
        _;
    }

    modifier notExpired(uint256 orderId) {
        require(block.timestamp <= escrowOrders[orderId].expiresAt, "Order expired");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function createEscrowOrder(
        address _partyB,
        address _nftContract,
        uint256 _nftTokenId,
        uint256 _cbtcAmount
    ) external validContract(_nftContract) {
        require(_partyB != address(0), "Invalid party B address");
        require(_cbtcAmount > 0, "CBTC amount must be greater than 0");

        EscrowOrder storage order = escrowOrders[nextOrderId];
        order.partyA = msg.sender;
        order.partyB = _partyB;
        order.nftContract = _nftContract;
        order.nftTokenId = _nftTokenId;
        order.cbtcAmount = _cbtcAmount;
        order.partyADeposited = false;
        order.partyBDeposited = false;
        order.executed = false;
        order.createdAt = block.timestamp;
        order.expiresAt = block.timestamp + ESCROW_DURATION;

        emit EscrowOrderCreated(
            nextOrderId,
            msg.sender,
            _partyB,
            _nftContract,
            _nftTokenId,
            _cbtcAmount
        );
        nextOrderId++;
    }

    function depositCBTCByPartyA(uint256 orderId) 
        external 
        payable 
        nonReentrant 
        onlyParties(orderId) 
        notExecuted(orderId)
        notExpired(orderId)
    {
        EscrowOrder storage order = escrowOrders[orderId];
        require(msg.sender == order.partyA, "Only party A can deposit CBTC");
        require(!order.partyADeposited, "Already deposited");
        require(msg.value == order.cbtcAmount, "Incorrect CBTC amount");

        order.partyADeposited = true;
        emit PartyADeposit(orderId, msg.sender, msg.value);
    }

    function depositNFTByPartyB(uint256 orderId) 
        external 
        nonReentrant 
        onlyParties(orderId) 
        notExecuted(orderId)
        notExpired(orderId)
    {
        EscrowOrder storage order = escrowOrders[orderId];
        require(msg.sender == order.partyB, "Only party B can deposit NFT");
        require(!order.partyBDeposited, "Already deposited");

        IERC721(order.nftContract).safeTransferFrom(
            msg.sender,
            address(this),
            order.nftTokenId
        );

        order.partyBDeposited = true;
        emit PartyBDeposit(orderId, msg.sender);
    }

    function executeTransaction(uint256 orderId) 
        external 
        nonReentrant 
        onlyParties(orderId) 
        notExecuted(orderId)
        notExpired(orderId)
    {
        EscrowOrder storage order = escrowOrders[orderId];
        require(order.partyADeposited, "Party A has not deposited CBTC");
        require(order.partyBDeposited, "Party B has not deposited NFT");

        // Calculate fee
        uint256 fee = (order.cbtcAmount * feePercentage) / FEE_DENOMINATOR;
        uint256 amountAfterFee = order.cbtcAmount - fee;

        // Transfer CBTC to party B (minus fee)
        (bool success, ) = order.partyB.call{value: amountAfterFee}("");
        require(success, "CBTC transfer failed");

        // Transfer NFT to party A
        IERC721(order.nftContract).safeTransferFrom(
            address(this),
            order.partyA,
            order.nftTokenId
        );

        order.executed = true;
        emit EscrowExecuted(orderId);
    }

    function cancelEscrow(uint256 orderId) 
        external 
        nonReentrant 
        onlyParties(orderId) 
        notExecuted(orderId)
    {
        EscrowOrder storage order = escrowOrders[orderId];
        
        // Allow cancellation if expired or both parties agree
        bool canCancel = block.timestamp > order.expiresAt || 
                        (msg.sender == order.partyA && !order.partyBDeposited) ||
                        (msg.sender == order.partyB && !order.partyADeposited);
        
        require(canCancel, "Cannot cancel at this time");

        // Refund CBTC to party A if deposited
        if (order.partyADeposited) {
            (bool success, ) = order.partyA.call{value: order.cbtcAmount}("");
            require(success, "CBTC refund failed");
        }

        // Return NFT to party B if deposited
        if (order.partyBDeposited) {
            IERC721(order.nftContract).safeTransferFrom(
                address(this),
                order.partyB,
                order.nftTokenId
            );
        }

        delete escrowOrders[orderId];
        emit EscrowCancelled(orderId);
    }

    function updateFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 500, "Fee cannot exceed 5%"); // Max 5%
        feePercentage = _newFeePercentage;
        emit FeeUpdated(_newFeePercentage);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }

    function getEscrowOrder(uint256 orderId) external view returns (EscrowOrder memory) {
        return escrowOrders[orderId];
    }

    // Required for receiving NFTs
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}`,
      category: "escrow"
    },
    {
      name: "NFT20Escrow Contract",
      description: "This smart contract facilitates secure peer-to-peer exchanges between Non-Fungible Tokens (NFTs) and ERC20 tokens. It acts as a trustless intermediary, ensuring both parties fulfill their commitments before the exchange is completed. For example, Alice can use this contract to safely trade her rare digital artwork NFT for Bob's USDT tokens without the risk of either party backing out mid-transaction. The contract holds both assets in escrow until both parties have made their deposits, after which the exchange can be executed, or cancelled if needed, providing a safe and efficient way to swap any NFT for ERC20 tokens.",
      contract_code: `// SPDX-License-Identifier: MIT
  pragma solidity 0.8.27;
  
  import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
  import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  
  /**
   * @title NFT-ERC20 Escrow Contract
   * @dev P2P NFT transactions using an ERC20 token (like USDT) through escrow.
   */
  contract NFT20Escrow is ReentrancyGuard {
      struct EscrowOrder {
          address partyA; 
          address partyB; 
          address erc20Contract;
          address nftContract;
          uint256 erc20Amount;
          uint256 nftTokenId;
          bool partyADeposited;
          bool partyBDeposited;
          bool executed;
      }
  
      mapping(uint256 => EscrowOrder) public escrowOrders; // Named mapping for better clarity
      uint256 public nextOrderId;
  
      event EscrowOrderCreated(
          uint256 indexed orderId,
          address indexed partyA,
          address indexed partyB,
          address erc20Contract,
          address nftContract,
          uint256 nftTokenId
      );
  
      event PartyADeposit(uint256 indexed orderId, address indexed partyA);
      event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
      event EscrowExecuted(uint256 indexed orderId);
      event EscrowCancelled(uint256 indexed orderId);
  
      modifier validContracts(address _erc20Contract, address _nftContract) {
          require(_erc20Contract.code.length > 0, "Invalid ERC20 contract");
          require(_nftContract.code.length > 0, "Invalid NFT contract");
          _;
      }
  
      modifier onlyParties(uint256 orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(
              msg.sender == order.partyA || msg.sender == order.partyB,
              "Not authorized"
          );
          _;
      }
  
      modifier notExecuted(uint256 orderId) {
          require(!escrowOrders[orderId].executed, "Already executed");
          _;
      }
  
      function createEscrowOrder(
          address _partyB,
          address _erc20Contract,
          uint256 _erc20Amount,
          address _nftContract,
          uint256 _nftTokenId
      ) external validContracts(_erc20Contract, _nftContract) {
          require(_erc20Amount != 0, "ERC20 amount must be non-zero");
  
          // Cache storage variables in memory
          address partyB = _partyB;
          address erc20Contract = _erc20Contract;
  
          // Use the cached variables
          EscrowOrder storage order = escrowOrders[nextOrderId];
          order.partyA = msg.sender;
          order.partyB = partyB;
          order.erc20Contract = erc20Contract;
          order.erc20Amount = _erc20Amount;
          order.nftContract = _nftContract;
          order.nftTokenId = _nftTokenId;
          order.partyADeposited = false;
          order.partyBDeposited = false;
          order.executed = false;
  
          emit EscrowOrderCreated(
              nextOrderId,
              msg.sender,
              partyB,
              erc20Contract,
              _nftContract,
              _nftTokenId
          );
          nextOrderId++;
      }
  
      function depositERC20(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyADeposited, "Already deposited");
  
          bool success = IERC20(order.erc20Contract).transferFrom(
              msg.sender,
              address(this),
              order.erc20Amount
          );
          require(success, "ERC20 transfer failed");
  
          order.partyADeposited = true;
          emit PartyADeposit(orderId, msg.sender);
      }
  
      function depositNFT(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyBDeposited, "Already deposited");
  
          IERC721(order.nftContract).safeTransferFrom(
              msg.sender,
              address(this),
              order.nftTokenId
          );
  
          order.partyBDeposited = true;
          emit PartyBDeposit(orderId, msg.sender);
      }
  
      function executeTransaction(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(order.partyADeposited, "PartyA has not deposited");
          require(order.partyBDeposited, "PartyB has not deposited");
          require(!order.executed, "Already executed");
  
          bool success = IERC20(order.erc20Contract).transfer(order.partyB, order.erc20Amount);
          require(success, "ERC20 transfer failed");
  
          IERC721(order.nftContract).safeTransferFrom(
              address(this),
              order.partyA,
              order.nftTokenId
          );
  
          order.executed = true;
          emit EscrowExecuted(orderId);
      }
  
      function cancelEscrow(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Cannot cancel executed order");
  
          if (order.partyADeposited) {
              bool success = IERC20(order.erc20Contract).transfer(order.partyA, order.erc20Amount);
              require(success, "ERC20 refund failed");
          }
  
          if (order.partyBDeposited) {
              IERC721(order.nftContract).safeTransferFrom(
                  address(this),
                  order.partyB,
                  order.nftTokenId
              );
          }
  
          delete escrowOrders[orderId];
          emit EscrowCancelled(orderId);
      }
  }`,
      category: "escrow"
    },
    {
      name: "NFT2NFTEscrow Contract",
      description: "This smart contract facilitates secure peer-to-peer exchanges between two different Non-Fungible Tokens (NFTs). It acts as a trustless intermediary, ensuring both parties fulfill their commitments before the exchange is completed. For example, Alice can use this contract to safely trade her rare digital artwork NFT for Bob's unique virtual real estate NFT without the risk of either party backing out mid-transaction. The contract holds both NFTs in escrow until both parties have made their deposits, after which the exchange can be executed, or cancelled if needed, providing a safe and efficient way to swap any two NFTs.",
      contract_code: `// SPDX-License-Identifier: MIT
  pragma solidity 0.8.27;
  
  import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  
  /**
   * @title NFT-to-NFT Escrow Contract
   * @dev P2P NFT transactions using another NFT through escrow.
   */
  contract NFT2NFTEscrow is ReentrancyGuard {
      struct EscrowOrder {
          address partyA;
          address partyB;
          address nftContractA;
          address nftContractB;
          uint256 nftTokenIdA;
          uint256 nftTokenIdB;
          bool partyADeposited;
          bool partyBDeposited;
          bool executed;
      }
  
      mapping(uint256 => EscrowOrder) public escrowOrders;
      uint256 public nextOrderId;
  
      event EscrowOrderCreated(
          uint256 indexed orderId,
          address indexed partyA,
          address indexed partyB,
          address nftContractA,
          address nftContractB,
          uint256 nftTokenIdA,
          uint256 nftTokenIdB
      );
  
      event PartyADeposit(uint256 indexed orderId, address indexed partyA);
      event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
      event EscrowExecuted(uint256 indexed orderId);
      event EscrowCancelled(uint256 indexed orderId);
  
      modifier validContracts(address _nftContractA, address _nftContractB) {
          require(_nftContractA.code.length > 0, "Invalid NFT contract A");
          require(_nftContractB.code.length > 0, "Invalid NFT contract B");
          _;
      }
  
      modifier onlyParties(uint256 orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(
              msg.sender == order.partyA || msg.sender == order.partyB,
              "Not authorized"
          );
          _;
      }
  
      modifier notExecuted(uint256 orderId) {
          require(!escrowOrders[orderId].executed, "Already executed");
          _;
      }
  
      function createEscrowOrder(
          address _partyB,
          address _nftContractA,
          uint256 _nftTokenIdA,
          address _nftContractB,
          uint256 _nftTokenIdB
      ) external validContracts(_nftContractA, _nftContractB) {
          EscrowOrder storage order = escrowOrders[nextOrderId];
          order.partyA = msg.sender;
          order.partyB = _partyB;
          order.nftContractA = _nftContractA;
          order.nftContractB = _nftContractB;
          order.nftTokenIdA = _nftTokenIdA;
          order.nftTokenIdB = _nftTokenIdB;
          order.partyADeposited = false;
          order.partyBDeposited = false;
          order.executed = false;
  
          emit EscrowOrderCreated(
              nextOrderId,
              msg.sender,
              _partyB,
              _nftContractA,
              _nftContractB,
              _nftTokenIdA,
              _nftTokenIdB
          );
          nextOrderId++;
      }
  
      function depositNFTByPartyA(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyADeposited, "Already deposited");
  
          IERC721(order.nftContractA).safeTransferFrom(
              msg.sender,
              address(this),
              order.nftTokenIdA
          );
  
          order.partyADeposited = true;
          emit PartyADeposit(orderId, msg.sender);
      }
  
      function depositNFTByPartyB(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyBDeposited, "Already deposited");
  
          IERC721(order.nftContractB).safeTransferFrom(
              msg.sender,
              address(this),
              order.nftTokenIdB
          );
  
          order.partyBDeposited = true;
          emit PartyBDeposit(orderId, msg.sender);
      }
  
      function executeTransaction(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(order.partyADeposited, "PartyA has not deposited");
          require(order.partyBDeposited, "PartyB has not deposited");
          require(!order.executed, "Already executed");
  
          IERC721(order.nftContractA).safeTransferFrom(
              address(this),
              order.partyB,
              order.nftTokenIdA
          );
  
          IERC721(order.nftContractB).safeTransferFrom(
              address(this),
              order.partyA,
              order.nftTokenIdB
          );
  
          order.executed = true;
          emit EscrowExecuted(orderId);
      }
  
      function cancelEscrow(uint256 orderId) external onlyParties(orderId) nonReentrant {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Cannot cancel executed order");
  
          if (order.partyADeposited) {
              IERC721(order.nftContractA).safeTransferFrom(
                  address(this),
                  order.partyA,
                  order.nftTokenIdA
              );
          }
  
          if (order.partyBDeposited) {
              IERC721(order.nftContractB).safeTransferFrom(
                  address(this),
                  order.partyB,
                  order.nftTokenIdB
              );
          }
  
          delete escrowOrders[orderId];
          emit EscrowCancelled(orderId);
      }
  }`,
      category: "escrow"
    },
    {
      name: "ERC20ToERC20Escrow Contract",
      description: "This smart contract facilitates secure peer-to-peer exchanges between different ERC20 tokens. It acts as a trustless intermediary, ensuring both parties fulfill their commitments before the exchange is completed. For example, Alice can use this contract to safely trade her USDC tokens for Bob's DAI tokens without the risk of either party backing out mid-transaction. The contract holds both types of tokens in escrow until both parties have made their deposits, after which the exchange can be executed, or cancelled if needed, providing a safe and efficient way to swap any two ERC20 tokens.",
      contract_code: `// SPDX-License-Identifier: MIT
  pragma solidity 0.8.27;
  
  import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  
  /**
   * @title ERC20-to-ERC20 Escrow Contract
   * @dev P2P transactions using ERC20 tokens through escrow.
   */
  contract ERC20ToERC20Escrow is ReentrancyGuard {
      struct EscrowOrder {
          address partyA;
          address partyB;
          address erc20ContractA;
          address erc20ContractB;
          uint256 erc20AmountA;
          uint256 erc20AmountB;
          bool partyADeposited;
          bool partyBDeposited;
          bool executed;
      }
  
      mapping(uint256 => EscrowOrder) public escrowOrders;
      uint256 public nextOrderId;
  
      event EscrowOrderCreated(
          uint256 indexed orderId,
          address indexed partyA,
          address indexed partyB,
          address erc20ContractA,
          address erc20ContractB,
          uint256 erc20AmountA,
          uint256 erc20AmountB
      );
  
      event PartyADeposit(uint256 indexed orderId, address indexed partyA);
      event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
      event EscrowExecuted(uint256 indexed orderId);
      event EscrowCancelled(uint256 indexed orderId);
  
      modifier validContract(address _erc20Contract) {
          require(_erc20Contract.code.length > 0, "Invalid ERC20 contract");
          _;
      }
  
      modifier onlyParties(uint256 orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(
              msg.sender == order.partyA || msg.sender == order.partyB,
              "Not authorized"
          );
          _;
      }
  
      modifier notExecuted(uint256 orderId) {
          require(!escrowOrders[orderId].executed, "Already executed");
          _;
      }
  
      function createEscrowOrder(
          address _partyB,
          address _erc20ContractA,
          uint256 _erc20AmountA,
          address _erc20ContractB,
          uint256 _erc20AmountB
      ) external validContract(_erc20ContractA) validContract(_erc20ContractB) {
          EscrowOrder storage order = escrowOrders[nextOrderId];
          order.partyA = msg.sender;
          order.partyB = _partyB;
          order.erc20ContractA = _erc20ContractA;
          order.erc20ContractB = _erc20ContractB;
          order.erc20AmountA = _erc20AmountA;
          order.erc20AmountB = _erc20AmountB;
          order.partyADeposited = false;
          order.partyBDeposited = false;
          order.executed = false;
  
          emit EscrowOrderCreated(
              nextOrderId,
              msg.sender,
              _partyB,
              _erc20ContractA,
              _erc20ContractB,
              _erc20AmountA,
              _erc20AmountB
          );
          nextOrderId++;
      }
  
      function depositERC20ByPartyA(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyADeposited, "Already deposited");
  
          bool success = IERC20(order.erc20ContractA).transferFrom(
              msg.sender,
              address(this),
              order.erc20AmountA
          );
          require(success, "ERC20 transfer failed");
  
          order.partyADeposited = true;
          emit PartyADeposit(orderId, msg.sender);
      }
  
      function depositERC20ByPartyB(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Already executed");
          require(!order.partyBDeposited, "Already deposited");
  
          bool success = IERC20(order.erc20ContractB).transferFrom(
              msg.sender,
              address(this),
              order.erc20AmountB
          );
          require(success, "ERC20 transfer failed");
  
          order.partyBDeposited = true;
          emit PartyBDeposit(orderId, msg.sender);
      }
  
      function executeTransaction(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(order.partyADeposited, "PartyA has not deposited");
          require(order.partyBDeposited, "PartyB has not deposited");
          require(!order.executed, "Already executed");
  
          bool success = IERC20(order.erc20ContractA).transfer(order.partyB, order.erc20AmountA);
          require(success, "ERC20 transfer failed");
  
          success = IERC20(order.erc20ContractB).transfer(order.partyA, order.erc20AmountB);
          require(success, "ERC20 transfer failed");
  
          order.executed = true;
          emit EscrowExecuted(orderId);
      }
  
      function cancelEscrow(uint256 orderId) external nonReentrant onlyParties(orderId) {
          EscrowOrder storage order = escrowOrders[orderId];
          require(!order.executed, "Cannot cancel executed order");
  
          if (order.partyADeposited) {
              bool success = IERC20(order.erc20ContractA).transfer(order.partyA, order.erc20AmountA);
              require(success, "ERC20 refund failed");
          }
  
          if (order.partyBDeposited) {
              bool success = IERC20(order.erc20ContractB).transfer(order.partyB, order.erc20AmountB);
              require(success, "ERC20 refund failed");
          }
  
          delete escrowOrders[orderId];
          emit EscrowCancelled(orderId);
      }
  }`,
      category: "escrow"
    }
  ];