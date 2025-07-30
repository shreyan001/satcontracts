export const contractsArray = [
  {
    name: "ETH2ERC20Escrow",
    contractCode: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ETH-to-ERC20 Escrow Contract
 * @dev P2P transactions using ETH through escrow for ERC20 tokens.
 */
contract ETH2ERC20Escrow is ReentrancyGuard {

    struct EscrowOrder {
        address partyA;
        address partyB;
        address erc20Contract;
        uint256 erc20Amount;
        uint256 ethAmount;
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
        address erc20Contract,
        uint256 erc20Amount,
        uint256 ethAmount
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
        address _erc20Contract,
        uint256 _erc20Amount,
        uint256 _ethAmount
    ) external validContract(_erc20Contract) {
        EscrowOrder storage order = escrowOrders[nextOrderId];
        order.partyA = msg.sender;
        order.partyB = _partyB;
        order.erc20Contract = _erc20Contract;
        order.erc20Amount = _erc20Amount;
        order.ethAmount = _ethAmount;
        order.partyADeposited = false;
        order.partyBDeposited = false;
        order.executed = false;

        emit EscrowOrderCreated(
            nextOrderId,
            msg.sender,
            _partyB,
            _erc20Contract,
            _erc20Amount,
            _ethAmount
        );
        nextOrderId++;
    }


    function depositETHByPartyA(uint256 orderId) external payable nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(!order.executed, "Already executed");
        require(!order.partyADeposited, "Already deposited");
        require(msg.value == order.ethAmount, "Incorrect ETH amount");

        order.partyADeposited = true;
        emit PartyADeposit(orderId, msg.sender);
    }

    function depositERC20ByPartyB(uint256 orderId) external nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(!order.executed, "Already executed");
        require(!order.partyBDeposited, "Already deposited");

        IERC20(order.erc20Contract).transferFrom(
            msg.sender,
            address(this),
            order.erc20Amount
        );

        order.partyBDeposited = true;
        emit PartyBDeposit(orderId, msg.sender);
    }

    function executeTransaction(uint256 orderId) external nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(order.partyADeposited, "PartyA has not deposited");
        require(order.partyBDeposited, "PartyB has not deposited");
        require(!order.executed, "Already executed");

        (bool success, ) = order.partyB.call{value: order.ethAmount}("");
        require(success, "ETH transfer failed");

        IERC20(order.erc20Contract).transfer(order.partyA, order.erc20Amount);

        order.executed = true;
        emit EscrowExecuted(orderId);
    }

    function cancelEscrow(uint256 orderId) external nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(!order.executed, "Cannot cancel executed order");

        if (order.partyADeposited) {
            (bool success, ) = order.partyA.call{value: order.ethAmount}("");
            require(success, "ETH refund failed");
        }

        if (order.partyBDeposited) {
            IERC20(order.erc20Contract).transfer(order.partyB, order.erc20Amount);
        }

        delete escrowOrders[orderId];
        emit EscrowCancelled(orderId);
    }
}`,
    abi: [{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"},{"indexed":false,"internalType":"address","name":"erc20Contract","type":"address"},{"indexed":false,"internalType":"uint256","name":"erc20Amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ethAmount","type":"uint256"}],"name":"EscrowOrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"}],"name":"PartyADeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"}],"name":"PartyBDeposit","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_partyB","type":"address"},{"internalType":"address","name":"_erc20Contract","type":"address"},{"internalType":"uint256","name":"_erc20Amount","type":"uint256"},{"internalType":"uint256","name":"_ethAmount","type":"uint256"}],"name":"createEscrowOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositERC20ByPartyB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositETHByPartyA","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"escrowOrders","outputs":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"erc20Contract","type":"address"},{"internalType":"uint256","name":"erc20Amount","type":"uint256"},{"internalType":"uint256","name":"ethAmount","type":"uint256"},{"internalType":"bool","name":"partyADeposited","type":"bool"},{"internalType":"bool","name":"partyBDeposited","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
    bytecode: "6080604052348015600e575f5ffd5b5060015f81905550611a2f806100235f395ff3fe60806040526004361061006f575f3560e01c8063dc752e8b1161004d578063dc752e8b146100e1578063e018243614610109578063ee22610b14610131578063fa44b377146101595761006f565b80632a58b3301461007357806331df723b1461009d57806352114c69146100b9575b5f5ffd5b34801561007e575f5ffd5b5061008761019c565b6040516100949190611269565b60405180910390f35b6100b760048036038101906100b291906112b0565b6101a2565b005b3480156100c4575f5ffd5b506100df60048036038101906100da91906112b0565b610413565b005b3480156100ec575f5ffd5b5061010760048036038101906101029190611335565b6106e5565b005b348015610114575f5ffd5b5061012f600480360381019061012a91906112b0565b61090a565b005b34801561013c575f5ffd5b50610157600480360381019061015291906112b0565b610d43565b005b348015610164575f5ffd5b5061017f600480360381019061017a91906112b0565b61113d565b6040516101939897969594939291906113c2565b60405180910390f35b60025481565b6101aa611204565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806102695750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b6102a8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161029f90611498565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff161561030e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161030590611500565b60405180910390fd5b806005015f9054906101000a900460ff161561035f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161035690611568565b60405180910390fd5b806004015434146103a5576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161039c906115d0565b60405180910390fd5b6001816005015f6101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f494718383d23bb1f740e6de47978a9681b0768710ad32f6d67eef935f7809a8060405160405180910390a3505050610410611248565b50565b61041b611204565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806104da5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610519576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161051090611498565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff161561057f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161057690611500565b60405180910390fd5b8060050160019054906101000a900460ff16156105d1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105c890611568565b60405180910390fd5b806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166323b872dd333084600301546040518463ffffffff1660e01b8152600401610635939291906115ee565b6020604051808303815f875af1158015610651573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610675919061164d565b5060018160050160016101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f988aef9037030efcc94e1c621ed73c793343d9d7445753e6de7c1674be92a31c60405160405180910390a35050506106e2611248565b50565b825f8173ffffffffffffffffffffffffffffffffffffffff163b1161073f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610736906116c2565b60405180910390fd5b5f60015f60025481526020019081526020015f20905033815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555085816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508381600301819055508281600401819055505f816005015f6101000a81548160ff0219169083151502179055505f8160050160016101000a81548160ff0219169083151502179055505f8160050160026101000a81548160ff0219169083151502179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff166002547f3d64ca7467896e4597c62a7e429f4cad32682ad0c30a21dc7b77445c473f21128888886040516108e3939291906116e0565b60405180910390a460025f8154809291906108fd90611742565b9190505550505050505050565b610912611204565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806109d15750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610a10576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a0790611498565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff1615610a76576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a6d906117d3565b60405180910390fd5b806005015f9054906101000a900460ff1615610b5c575f815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168260040154604051610ad79061181e565b5f6040518083038185875af1925050503d805f8114610b11576040519150601f19603f3d011682016040523d82523d5f602084013e610b16565b606091505b5050905080610b5a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b519061187c565b60405180910390fd5b505b8060050160019054906101000a900460ff1615610c3a57806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb826001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1683600301546040518363ffffffff1660e01b8152600401610bf892919061189a565b6020604051808303815f875af1158015610c14573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610c38919061164d565b505b60015f8581526020019081526020015f205f5f82015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600182015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600282015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600382015f9055600482015f9055600582015f6101000a81549060ff02191690556005820160016101000a81549060ff02191690556005820160026101000a81549060ff02191690555050837f0d977c6b1a383ac5ce532b4a668d0ef9ad38478e1a5ff28abb221f4b682b264360405160405180910390a2505050610d40611248565b50565b610d4b611204565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610e0a5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610e49576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e4090611498565b60405180910390fd5b5f60015f8581526020019081526020015f209050806005015f9054906101000a900460ff16610ead576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ea49061190b565b60405180910390fd5b8060050160019054906101000a900460ff16610efe576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ef590611973565b60405180910390fd5b8060050160029054906101000a900460ff1615610f50576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f4790611500565b60405180910390fd5b5f816001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168260040154604051610f9c9061181e565b5f6040518083038185875af1925050503d805f8114610fd6576040519150601f19603f3d011682016040523d82523d5f602084013e610fdb565b606091505b505090508061101f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611016906119db565b60405180910390fd5b816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600301546040518363ffffffff1660e01b81526004016110a392919061189a565b6020604051808303815f875af11580156110bf573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110e3919061164d565b5060018260050160026101000a81548160ff021916908315150217905550847f115dcb3a8fe6c704afaa7821675c7cd813fa08a3e79d90984654dd42b357649160405160405180910390a25050505061113a611248565b50565b6001602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806003015490806004015490806005015f9054906101000a900460ff16908060050160019054906101000a900460ff16908060050160029054906101000a900460ff16905088565b60025f540361123f576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f81905550565b60015f81905550565b5f819050919050565b61126381611251565b82525050565b5f60208201905061127c5f83018461125a565b92915050565b5f5ffd5b61128f81611251565b8114611299575f5ffd5b50565b5f813590506112aa81611286565b92915050565b5f602082840312156112c5576112c4611282565b5b5f6112d28482850161129c565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f611304826112db565b9050919050565b611314816112fa565b811461131e575f5ffd5b50565b5f8135905061132f8161130b565b92915050565b5f5f5f5f6080858703121561134d5761134c611282565b5b5f61135a87828801611321565b945050602061136b87828801611321565b935050604061137c8782880161129c565b925050606061138d8782880161129c565b91505092959194509250565b6113a2816112fa565b82525050565b5f8115159050919050565b6113bc816113a8565b82525050565b5f610100820190506113d65f83018b611399565b6113e3602083018a611399565b6113f06040830189611399565b6113fd606083018861125a565b61140a608083018761125a565b61141760a08301866113b3565b61142460c08301856113b3565b61143160e08301846113b3565b9998505050505050505050565b5f82825260208201905092915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f611482600e8361143e565b915061148d8261144e565b602082019050919050565b5f6020820190508181035f8301526114af81611476565b9050919050565b7f416c7265616479206578656375746564000000000000000000000000000000005f82015250565b5f6114ea60108361143e565b91506114f5826114b6565b602082019050919050565b5f6020820190508181035f830152611517816114de565b9050919050565b7f416c7265616479206465706f73697465640000000000000000000000000000005f82015250565b5f61155260118361143e565b915061155d8261151e565b602082019050919050565b5f6020820190508181035f83015261157f81611546565b9050919050565b7f496e636f72726563742045544820616d6f756e740000000000000000000000005f82015250565b5f6115ba60148361143e565b91506115c582611586565b602082019050919050565b5f6020820190508181035f8301526115e7816115ae565b9050919050565b5f6060820190506116015f830186611399565b61160e6020830185611399565b61161b604083018461125a565b949350505050565b61162c816113a8565b8114611636575f5ffd5b50565b5f8151905061164781611623565b92915050565b5f6020828403121561166257611661611282565b5b5f61166f84828501611639565b91505092915050565b7f496e76616c696420455243323020636f6e7472616374000000000000000000005f82015250565b5f6116ac60168361143e565b91506116b782611678565b602082019050919050565b5f6020820190508181035f8301526116d9816116a0565b9050919050565b5f6060820190506116f35f830186611399565b611700602083018561125a565b61170d604083018461125a565b949350505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61174c82611251565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361177e5761177d611715565b5b600182019050919050565b7f43616e6e6f742063616e63656c206578656375746564206f72646572000000005f82015250565b5f6117bd601c8361143e565b91506117c882611789565b602082019050919050565b5f6020820190508181035f8301526117ea816117b1565b9050919050565b5f81905092915050565b50565b5f6118095f836117f1565b9150611814826117fb565b5f82019050919050565b5f611828826117fe565b9150819050919050565b7f45544820726566756e64206661696c65640000000000000000000000000000005f82015250565b5f61186660118361143e565b915061187182611832565b602082019050919050565b5f6020820190508181035f8301526118938161185a565b9050919050565b5f6040820190506118ad5f830185611399565b6118ba602083018461125a565b9392505050565b7f50617274794120686173206e6f74206465706f736974656400000000000000005f82015250565b5f6118f560188361143e565b9150611900826118c1565b602082019050919050565b5f6020820190508181035f830152611922816118e9565b9050919050565b7f50617274794220686173206e6f74206465706f736974656400000000000000005f82015250565b5f61195d60188361143e565b915061196882611929565b602082019050919050565b5f6020820190508181035f83015261198a81611951565b9050919050565b7f455448207472616e73666572206661696c6564000000000000000000000000005f82015250565b5f6119c560138361143e565b91506119d082611991565b602082019050919050565b5f6020820190508181035f8301526119f2816119b9565b905091905056fea26469706673582212209d6193f0ab7e980ed19a8a94020953e69294ccc87adac8e9042aa1555b10f56264736f6c634300081b0033", 
    solidityScanResults: {
        securityScore: 85.38,
        threatScore: 100,
        securityScoreComments: "Your Security Score is GREAT\n\nThe SolidityScan score is calculated based on lines of code and weights assigned to each issue depending on the severity and confidence. To improve your score, view the detailed result and leverage the remediation solutions provided.",
        securityScanComments: "THREAT SUMMARY\n\nYour smart contract has been assessed and assigned a Low Risk threat score. The score indicates the likelihood of risk associated with the contract code."
      }
  },
  {
    name: "ETH2NFTEscrow",
    contractCode: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ETH-to-NFT Escrow Contract
 * @dev P2P transactions using ETH through escrow for NFTs.
 */
contract ETH2NFTEscrow is ReentrancyGuard {

    struct EscrowOrder {
        address partyA;
        address partyB;
        address nftContract;
        uint256 nftTokenId;
        uint256 ethAmount;
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
        address nftContract,
        uint256 nftTokenId,
        uint256 ethAmount
    );

    event PartyADeposit(uint256 indexed orderId, address indexed partyA);
    event PartyBDeposit(uint256 indexed orderId, address indexed partyB);
    event EscrowExecuted(uint256 indexed orderId);
    event EscrowCancelled(uint256 indexed orderId);

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

    function createEscrowOrder(
        address _partyB,
        address _nftContract,
        uint256 _nftTokenId,
        uint256 _ethAmount
    ) external validContract(_nftContract) {
        EscrowOrder storage order = escrowOrders[nextOrderId];
        order.partyA = msg.sender;
        order.partyB = _partyB;
        order.nftContract = _nftContract;
        order.nftTokenId = _nftTokenId;
        order.ethAmount = _ethAmount;
        order.partyADeposited = false;
        order.partyBDeposited = false;
        order.executed = false;

        emit EscrowOrderCreated(
            nextOrderId,
            msg.sender,
            _partyB,
            _nftContract,
            _nftTokenId,
            _ethAmount
        );
        nextOrderId++;
    }

    function depositETHByPartyA(uint256 orderId) external payable nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(!order.executed, "Already executed");
        require(!order.partyADeposited, "Already deposited");
        require(msg.value == order.ethAmount, "Incorrect ETH amount");

        order.partyADeposited = true;
        emit PartyADeposit(orderId, msg.sender);
    }

    function depositNFTByPartyB(uint256 orderId) external nonReentrant onlyParties(orderId) {
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

    function executeTransaction(uint256 orderId) external nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(order.partyADeposited, "PartyA has not deposited");
        require(order.partyBDeposited, "PartyB has not deposited");
        require(!order.executed, "Already executed");

        (bool success, ) = order.partyB.call{value: order.ethAmount}("");
        require(success, "ETH transfer failed");

        IERC721(order.nftContract).safeTransferFrom(
            address(this),
            order.partyA,
            order.nftTokenId
        );

        order.executed = true;
        emit EscrowExecuted(orderId);
    }

    function cancelEscrow(uint256 orderId) external nonReentrant onlyParties(orderId) {
        EscrowOrder storage order = escrowOrders[orderId];
        require(!order.executed, "Cannot cancel executed order");

        if (order.partyADeposited) {
            (bool success, ) = order.partyA.call{value: order.ethAmount}("");
            require(success, "ETH refund failed");
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
    abi: [{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"},{"indexed":false,"internalType":"address","name":"nftContract","type":"address"},{"indexed":false,"internalType":"uint256","name":"nftTokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ethAmount","type":"uint256"}],"name":"EscrowOrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"}],"name":"PartyADeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"}],"name":"PartyBDeposit","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_partyB","type":"address"},{"internalType":"address","name":"_nftContract","type":"address"},{"internalType":"uint256","name":"_nftTokenId","type":"uint256"},{"internalType":"uint256","name":"_ethAmount","type":"uint256"}],"name":"createEscrowOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositETHByPartyA","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositNFTByPartyB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"escrowOrders","outputs":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"nftContract","type":"address"},{"internalType":"uint256","name":"nftTokenId","type":"uint256"},{"internalType":"uint256","name":"ethAmount","type":"uint256"},{"internalType":"bool","name":"partyADeposited","type":"bool"},{"internalType":"bool","name":"partyBDeposited","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}], // You'll need to fill this with the actual ABI after deployment
    bytecode: "6080604052348015600e575f5ffd5b5060015f8190555061197b806100235f395ff3fe60806040526004361061006f575f3560e01c8063dc752e8b1161004d578063dc752e8b146100e1578063e018243614610109578063ee22610b14610131578063fa44b377146101595761006f565b80632a58b3301461007357806331df723b1461009d578063c17da6d8146100b9575b5f5ffd5b34801561007e575f5ffd5b5061008761019c565b6040516100949190611231565b60405180910390f35b6100b760048036038101906100b29190611278565b6101a2565b005b3480156100c4575f5ffd5b506100df60048036038101906100da9190611278565b610413565b005b3480156100ec575f5ffd5b50610107600480360381019061010291906112fd565b6106d1565b005b348015610114575f5ffd5b5061012f600480360381019061012a9190611278565b6108f6565b005b34801561013c575f5ffd5b5061015760048036038101906101529190611278565b610d1d565b005b348015610164575f5ffd5b5061017f600480360381019061017a9190611278565b611105565b60405161019398979695949392919061138a565b60405180910390f35b60025481565b6101aa6111cc565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806102695750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b6102a8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161029f90611460565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff161561030e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610305906114c8565b60405180910390fd5b806005015f9054906101000a900460ff161561035f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161035690611530565b60405180910390fd5b806004015434146103a5576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161039c90611598565b60405180910390fd5b6001816005015f6101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f494718383d23bb1f740e6de47978a9681b0768710ad32f6d67eef935f7809a8060405160405180910390a3505050610410611210565b50565b61041b6111cc565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806104da5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610519576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161051090611460565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff161561057f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610576906114c8565b60405180910390fd5b8060050160019054906101000a900460ff16156105d1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105c890611530565b60405180910390fd5b806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e333084600301546040518463ffffffff1660e01b8152600401610635939291906115b6565b5f604051808303815f87803b15801561064c575f5ffd5b505af115801561065e573d5f5f3e3d5ffd5b5050505060018160050160016101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f988aef9037030efcc94e1c621ed73c793343d9d7445753e6de7c1674be92a31c60405160405180910390a35050506106ce611210565b50565b825f8173ffffffffffffffffffffffffffffffffffffffff163b1161072b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161072290611635565b60405180910390fd5b5f60015f60025481526020019081526020015f20905033815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555085816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508381600301819055508281600401819055505f816005015f6101000a81548160ff0219169083151502179055505f8160050160016101000a81548160ff0219169083151502179055505f8160050160026101000a81548160ff0219169083151502179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff166002547f3d64ca7467896e4597c62a7e429f4cad32682ad0c30a21dc7b77445c473f21128888886040516108cf93929190611653565b60405180910390a460025f8154809291906108e9906116b5565b9190505550505050505050565b6108fe6111cc565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806109bd5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b6109fc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109f390611460565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060050160029054906101000a900460ff1615610a62576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a5990611746565b60405180910390fd5b806005015f9054906101000a900460ff1615610b48575f815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168260040154604051610ac390611791565b5f6040518083038185875af1925050503d805f8114610afd576040519150601f19603f3d011682016040523d82523d5f602084013e610b02565b606091505b5050905080610b46576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b3d906117ef565b60405180910390fd5b505b8060050160019054906101000a900460ff1615610c1457806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600301546040518463ffffffff1660e01b8152600401610be6939291906115b6565b5f604051808303815f87803b158015610bfd575f5ffd5b505af1158015610c0f573d5f5f3e3d5ffd5b505050505b60015f8581526020019081526020015f205f5f82015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600182015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600282015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600382015f9055600482015f9055600582015f6101000a81549060ff02191690556005820160016101000a81549060ff02191690556005820160026101000a81549060ff02191690555050837f0d977c6b1a383ac5ce532b4a668d0ef9ad38478e1a5ff28abb221f4b682b264360405160405180910390a2505050610d1a611210565b50565b610d256111cc565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610de45750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610e23576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e1a90611460565b60405180910390fd5b5f60015f8581526020019081526020015f209050806005015f9054906101000a900460ff16610e87576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e7e90611857565b60405180910390fd5b8060050160019054906101000a900460ff16610ed8576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ecf906118bf565b60405180910390fd5b8060050160029054906101000a900460ff1615610f2a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f21906114c8565b60405180910390fd5b5f816001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168260040154604051610f7690611791565b5f6040518083038185875af1925050503d805f8114610fb0576040519150601f19603f3d011682016040523d82523d5f602084013e610fb5565b606091505b5050905080610ff9576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ff090611927565b60405180910390fd5b816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30845f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1685600301546040518463ffffffff1660e01b815260040161107f939291906115b6565b5f604051808303815f87803b158015611096575f5ffd5b505af11580156110a8573d5f5f3e3d5ffd5b5050505060018260050160026101000a81548160ff021916908315150217905550847f115dcb3a8fe6c704afaa7821675c7cd813fa08a3e79d90984654dd42b357649160405160405180910390a250505050611102611210565b50565b6001602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806003015490806004015490806005015f9054906101000a900460ff16908060050160019054906101000a900460ff16908060050160029054906101000a900460ff16905088565b60025f5403611207576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f81905550565b60015f81905550565b5f819050919050565b61122b81611219565b82525050565b5f6020820190506112445f830184611222565b92915050565b5f5ffd5b61125781611219565b8114611261575f5ffd5b50565b5f813590506112728161124e565b92915050565b5f6020828403121561128d5761128c61124a565b5b5f61129a84828501611264565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6112cc826112a3565b9050919050565b6112dc816112c2565b81146112e6575f5ffd5b50565b5f813590506112f7816112d3565b92915050565b5f5f5f5f608085870312156113155761131461124a565b5b5f611322878288016112e9565b9450506020611333878288016112e9565b935050604061134487828801611264565b925050606061135587828801611264565b91505092959194509250565b61136a816112c2565b82525050565b5f8115159050919050565b61138481611370565b82525050565b5f6101008201905061139e5f83018b611361565b6113ab602083018a611361565b6113b86040830189611361565b6113c56060830188611222565b6113d26080830187611222565b6113df60a083018661137b565b6113ec60c083018561137b565b6113f960e083018461137b565b9998505050505050505050565b5f82825260208201905092915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f61144a600e83611406565b915061145582611416565b602082019050919050565b5f6020820190508181035f8301526114778161143e565b9050919050565b7f416c7265616479206578656375746564000000000000000000000000000000005f82015250565b5f6114b2601083611406565b91506114bd8261147e565b602082019050919050565b5f6020820190508181035f8301526114df816114a6565b9050919050565b7f416c7265616479206465706f73697465640000000000000000000000000000005f82015250565b5f61151a601183611406565b9150611525826114e6565b602082019050919050565b5f6020820190508181035f8301526115478161150e565b9050919050565b7f496e636f72726563742045544820616d6f756e740000000000000000000000005f82015250565b5f611582601483611406565b915061158d8261154e565b602082019050919050565b5f6020820190508181035f8301526115af81611576565b9050919050565b5f6060820190506115c95f830186611361565b6115d66020830185611361565b6115e36040830184611222565b949350505050565b7f496e76616c6964204e465420636f6e74726163740000000000000000000000005f82015250565b5f61161f601483611406565b915061162a826115eb565b602082019050919050565b5f6020820190508181035f83015261164c81611613565b9050919050565b5f6060820190506116665f830186611361565b6116736020830185611222565b6116806040830184611222565b949350505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6116bf82611219565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036116f1576116f0611688565b5b600182019050919050565b7f43616e6e6f742063616e63656c206578656375746564206f72646572000000005f82015250565b5f611730601c83611406565b915061173b826116fc565b602082019050919050565b5f6020820190508181035f83015261175d81611724565b9050919050565b5f81905092915050565b50565b5f61177c5f83611764565b91506117878261176e565b5f82019050919050565b5f61179b82611771565b9150819050919050565b7f45544820726566756e64206661696c65640000000000000000000000000000005f82015250565b5f6117d9601183611406565b91506117e4826117a5565b602082019050919050565b5f6020820190508181035f830152611806816117cd565b9050919050565b7f50617274794120686173206e6f74206465706f736974656400000000000000005f82015250565b5f611841601883611406565b915061184c8261180d565b602082019050919050565b5f6020820190508181035f83015261186e81611835565b9050919050565b7f50617274794220686173206e6f74206465706f736974656400000000000000005f82015250565b5f6118a9601883611406565b91506118b482611875565b602082019050919050565b5f6020820190508181035f8301526118d68161189d565b9050919050565b7f455448207472616e73666572206661696c6564000000000000000000000000005f82015250565b5f611911601383611406565b915061191c826118dd565b602082019050919050565b5f6020820190508181035f83015261193e81611905565b905091905056fea26469706673582212206c6e26841a335b8e292f8c976bd7f419de530dcb17d3235a5fcdf90c4933bf3364736f6c634300081b0033",
     // You'll need to fill this with the actual bytecode after deployment

     solidityScanResults: {
        securityScore: 86.93,
        threatScore: 100,
        securityScoreComments: "Your Security Score is GREAT\n\nThe SolidityScan score is calculated based on lines of code and weights assigned to each issue depending on the severity and confidence. To improve your score, view the detailed result and leverage the remediation solutions provided.",
        securityScanComments: "THREAT SUMMARY\n\nYour smart contract has been assessed and assigned a Low Risk threat score. The score indicates the likelihood of risk associated with the contract code."
      }
  },
  {
    name: "NFT20Escrow",
    contractCode: `// SPDX-License-Identifier: MIT
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
    abi: [{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"},{"indexed":false,"internalType":"address","name":"erc20Contract","type":"address"},{"indexed":false,"internalType":"address","name":"nftContract","type":"address"},{"indexed":false,"internalType":"uint256","name":"nftTokenId","type":"uint256"}],"name":"EscrowOrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"}],"name":"PartyADeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"}],"name":"PartyBDeposit","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_partyB","type":"address"},{"internalType":"address","name":"_erc20Contract","type":"address"},{"internalType":"uint256","name":"_erc20Amount","type":"uint256"},{"internalType":"address","name":"_nftContract","type":"address"},{"internalType":"uint256","name":"_nftTokenId","type":"uint256"}],"name":"createEscrowOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"escrowOrders","outputs":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"erc20Contract","type":"address"},{"internalType":"address","name":"nftContract","type":"address"},{"internalType":"uint256","name":"erc20Amount","type":"uint256"},{"internalType":"uint256","name":"nftTokenId","type":"uint256"},{"internalType":"bool","name":"partyADeposited","type":"bool"},{"internalType":"bool","name":"partyBDeposited","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}], // You'll need to fill this with the actual ABI after deployment
    bytecode: "6080604052348015600e575f5ffd5b5060015f81905550611c19806100235f395ff3fe608060405234801561000f575f5ffd5b506004361061007b575f3560e01c8063e018243611610059578063e0182436146100d5578063e91a7ca6146100f1578063ee22610b1461010d578063fa44b377146101295761007b565b80632a58b3301461007f578063639e6afe1461009d578063b79092fd146100b9575b5f5ffd5b610087610161565b604051610094919061143f565b60405180910390f35b6100b760048036038101906100b291906114e0565b610167565b005b6100d360048036038101906100ce9190611557565b610476565b005b6100ef60048036038101906100ea9190611557565b610789565b005b61010b60048036038101906101069190611557565b610c0f565b005b61012760048036038101906101229190611557565b610ecd565b005b610143600480360381019061013e9190611557565b6112ee565b604051610158999897969594939291906115ab565b60405180910390f35b60025481565b83825f8273ffffffffffffffffffffffffffffffffffffffff163b116101c2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101b990611690565b60405180910390fd5b5f8173ffffffffffffffffffffffffffffffffffffffff163b1161021b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610212906116f8565b60405180910390fd5b5f850361025d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161025490611760565b60405180910390fd5b5f8790505f8790505f60015f60025481526020019081526020015f20905033815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555082816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555081816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555087816004018190555086816003015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508581600501819055505f816006015f6101000a81548160ff0219169083151502179055505f8160060160016101000a81548160ff0219169083151502179055505f8160060160026101000a81548160ff0219169083151502179055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff166002547f69c6f86f753241d935da78f7f0874a46e9557b98d0aa411e4ed83c6ec2d7d950858b8b60405161044b9392919061177e565b60405180910390a460025f815480929190610465906117e0565b919050555050505050505050505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806105355750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610574576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161056b90611871565b60405180910390fd5b61057c6113da565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff16156105e2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105d9906118d9565b60405180910390fd5b806006015f9054906101000a900460ff1615610633576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161062a90611941565b60405180910390fd5b5f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166323b872dd333085600401546040518463ffffffff1660e01b81526004016106989392919061177e565b6020604051808303815f875af11580156106b4573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906106d89190611989565b90508061071a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610711906119fe565b60405180910390fd5b6001826006015f6101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16857f494718383d23bb1f740e6de47978a9681b0768710ad32f6d67eef935f7809a8060405160405180910390a3505061078461141e565b505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806108485750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610887576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161087e90611871565b60405180910390fd5b61088f6113da565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff16156108f5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108ec90611a66565b60405180910390fd5b806006015f9054906101000a900460ff1615610a14575f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518363ffffffff1660e01b8152600401610990929190611a84565b6020604051808303815f875af11580156109ac573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906109d09190611989565b905080610a12576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a0990611af5565b60405180910390fd5b505b8060060160019054906101000a900460ff1615610ae057806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600501546040518463ffffffff1660e01b8152600401610ab29392919061177e565b5f604051808303815f87803b158015610ac9575f5ffd5b505af1158015610adb573d5f5f3e3d5ffd5b505050505b60015f8581526020019081526020015f205f5f82015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600182015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600282015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600382015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600482015f9055600582015f9055600682015f6101000a81549060ff02191690556006820160016101000a81549060ff02191690556006820160026101000a81549060ff02191690555050837f0d977c6b1a383ac5ce532b4a668d0ef9ad38478e1a5ff28abb221f4b682b264360405160405180910390a250610c0a61141e565b505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610cce5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610d0d576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d0490611871565b60405180910390fd5b610d156113da565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff1615610d7b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d72906118d9565b60405180910390fd5b8060060160019054906101000a900460ff1615610dcd576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610dc490611941565b60405180910390fd5b806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e333084600501546040518463ffffffff1660e01b8152600401610e319392919061177e565b5f604051808303815f87803b158015610e48575f5ffd5b505af1158015610e5a573d5f5f3e3d5ffd5b5050505060018160060160016101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f988aef9037030efcc94e1c621ed73c793343d9d7445753e6de7c1674be92a31c60405160405180910390a350610ec861141e565b505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610f8c5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610fcb576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610fc290611871565b60405180910390fd5b610fd36113da565b5f60015f8581526020019081526020015f209050806006015f9054906101000a900460ff16611037576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161102e90611b5d565b60405180910390fd5b8060060160019054906101000a900460ff16611088576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161107f90611bc5565b60405180910390fd5b8060060160029054906101000a900460ff16156110da576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110d1906118d9565b60405180910390fd5b5f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518363ffffffff1660e01b8152600401611160929190611a84565b6020604051808303815f875af115801561117c573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906111a09190611989565b9050806111e2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016111d9906119fe565b60405180910390fd5b816003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30845f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1685600501546040518463ffffffff1660e01b81526004016112689392919061177e565b5f604051808303815f87803b15801561127f575f5ffd5b505af1158015611291573d5f5f3e3d5ffd5b5050505060018260060160026101000a81548160ff021916908315150217905550847f115dcb3a8fe6c704afaa7821675c7cd813fa08a3e79d90984654dd42b357649160405160405180910390a250506112e961141e565b505050565b6001602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806004015490806005015490806006015f9054906101000a900460ff16908060060160019054906101000a900460ff16908060060160029054906101000a900460ff16905089565b60025f5403611415576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f81905550565b60015f81905550565b5f819050919050565b61143981611427565b82525050565b5f6020820190506114525f830184611430565b92915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6114858261145c565b9050919050565b6114958161147b565b811461149f575f5ffd5b50565b5f813590506114b08161148c565b92915050565b6114bf81611427565b81146114c9575f5ffd5b50565b5f813590506114da816114b6565b92915050565b5f5f5f5f5f60a086880312156114f9576114f8611458565b5b5f611506888289016114a2565b9550506020611517888289016114a2565b9450506040611528888289016114cc565b9350506060611539888289016114a2565b925050608061154a888289016114cc565b9150509295509295909350565b5f6020828403121561156c5761156b611458565b5b5f611579848285016114cc565b91505092915050565b61158b8161147b565b82525050565b5f8115159050919050565b6115a581611591565b82525050565b5f610120820190506115bf5f83018c611582565b6115cc602083018b611582565b6115d9604083018a611582565b6115e66060830189611582565b6115f36080830188611430565b61160060a0830187611430565b61160d60c083018661159c565b61161a60e083018561159c565b61162861010083018461159c565b9a9950505050505050505050565b5f82825260208201905092915050565b7f496e76616c696420455243323020636f6e7472616374000000000000000000005f82015250565b5f61167a601683611636565b915061168582611646565b602082019050919050565b5f6020820190508181035f8301526116a78161166e565b9050919050565b7f496e76616c6964204e465420636f6e74726163740000000000000000000000005f82015250565b5f6116e2601483611636565b91506116ed826116ae565b602082019050919050565b5f6020820190508181035f83015261170f816116d6565b9050919050565b7f455243323020616d6f756e74206d757374206265206e6f6e2d7a65726f0000005f82015250565b5f61174a601d83611636565b915061175582611716565b602082019050919050565b5f6020820190508181035f8301526117778161173e565b9050919050565b5f6060820190506117915f830186611582565b61179e6020830185611582565b6117ab6040830184611430565b949350505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6117ea82611427565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361181c5761181b6117b3565b5b600182019050919050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f61185b600e83611636565b915061186682611827565b602082019050919050565b5f6020820190508181035f8301526118888161184f565b9050919050565b7f416c7265616479206578656375746564000000000000000000000000000000005f82015250565b5f6118c3601083611636565b91506118ce8261188f565b602082019050919050565b5f6020820190508181035f8301526118f0816118b7565b9050919050565b7f416c7265616479206465706f73697465640000000000000000000000000000005f82015250565b5f61192b601183611636565b9150611936826118f7565b602082019050919050565b5f6020820190508181035f8301526119588161191f565b9050919050565b61196881611591565b8114611972575f5ffd5b50565b5f815190506119838161195f565b92915050565b5f6020828403121561199e5761199d611458565b5b5f6119ab84828501611975565b91505092915050565b7f4552433230207472616e73666572206661696c656400000000000000000000005f82015250565b5f6119e8601583611636565b91506119f3826119b4565b602082019050919050565b5f6020820190508181035f830152611a15816119dc565b9050919050565b7f43616e6e6f742063616e63656c206578656375746564206f72646572000000005f82015250565b5f611a50601c83611636565b9150611a5b82611a1c565b602082019050919050565b5f6020820190508181035f830152611a7d81611a44565b9050919050565b5f604082019050611a975f830185611582565b611aa46020830184611430565b9392505050565b7f455243323020726566756e64206661696c6564000000000000000000000000005f82015250565b5f611adf601383611636565b9150611aea82611aab565b602082019050919050565b5f6020820190508181035f830152611b0c81611ad3565b9050919050565b7f50617274794120686173206e6f74206465706f736974656400000000000000005f82015250565b5f611b47601883611636565b9150611b5282611b13565b602082019050919050565b5f6020820190508181035f830152611b7481611b3b565b9050919050565b7f50617274794220686173206e6f74206465706f736974656400000000000000005f82015250565b5f611baf601883611636565b9150611bba82611b7b565b602082019050919050565b5f6020820190508181035f830152611bdc81611ba3565b905091905056fea2646970667358221220173b8c995e6802c6a22a381e05acd2d17dfd41bce134f0c766896eb6f681f54c64736f6c634300081b0033" ,// You'll need to fill this with the actual bytecode after deployment
  

    solidityScanResults: {
        securityScore: 84.34,
        threatScore: 100,
        securityScoreComments: "Your Security Score is GREAT\n\nThe SolidityScan score is calculated based on lines of code and weights assigned to each issue depending on the severity and confidence. To improve your score, view the detailed result and leverage the remediation solutions provided.",
        threatSummary: "THREAT SUMMARY\n\nYour smart contract has been assessed and assigned a Low Risk threat score. The score indicates the likelihood of risk associated with the contract code."
    },


},
  {
    name: "NFT2NFTEscrow",
    contractCode: `// SPDX-License-Identifier: MIT
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
    abi: [{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"},{"indexed":false,"internalType":"address","name":"nftContractA","type":"address"},{"indexed":false,"internalType":"address","name":"nftContractB","type":"address"},{"indexed":false,"internalType":"uint256","name":"nftTokenIdA","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nftTokenIdB","type":"uint256"}],"name":"EscrowOrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"}],"name":"PartyADeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"}],"name":"PartyBDeposit","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_partyB","type":"address"},{"internalType":"address","name":"_nftContractA","type":"address"},{"internalType":"uint256","name":"_nftTokenIdA","type":"uint256"},{"internalType":"address","name":"_nftContractB","type":"address"},{"internalType":"uint256","name":"_nftTokenIdB","type":"uint256"}],"name":"createEscrowOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositNFTByPartyA","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositNFTByPartyB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"escrowOrders","outputs":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"nftContractA","type":"address"},{"internalType":"address","name":"nftContractB","type":"address"},{"internalType":"uint256","name":"nftTokenIdA","type":"uint256"},{"internalType":"uint256","name":"nftTokenIdB","type":"uint256"},{"internalType":"bool","name":"partyADeposited","type":"bool"},{"internalType":"bool","name":"partyBDeposited","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}], // You'll need to fill this with the actual ABI after deployment
    bytecode: "6080604052348015600e575f5ffd5b5060015f8190555061195d806100235f395ff3fe608060405234801561000f575f5ffd5b506004361061007b575f3560e01c8063c17da6d811610059578063c17da6d8146100d5578063e0182436146100f1578063ee22610b1461010d578063fa44b377146101295761007b565b80630448379a1461007f5780632a58b3301461009b578063639e6afe146100b9575b5f5ffd5b61009960048036038101906100949190611313565b610161565b005b6100a361041d565b6040516100b0919061134d565b60405180910390f35b6100d360048036038101906100ce91906113c0565b610423565b005b6100ef60048036038101906100ea9190611313565b6106e8565b005b61010b60048036038101906101069190611313565b6109a6565b005b61012760048036038101906101229190611313565b610dd7565b005b610143600480360381019061013e9190611313565b6111a3565b60405161015899989796959493929190611460565b60405180910390f35b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806102205750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b61025f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161025690611545565b60405180910390fd5b61026761128f565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff16156102cd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c4906115ad565b60405180910390fd5b806006015f9054906101000a900460ff161561031e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161031590611615565b60405180910390fd5b806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e333084600401546040518463ffffffff1660e01b815260040161038293929190611633565b5f604051808303815f87803b158015610399575f5ffd5b505af11580156103ab573d5f5f3e3d5ffd5b505050506001816006015f6101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f494718383d23bb1f740e6de47978a9681b0768710ad32f6d67eef935f7809a8060405160405180910390a3506104186112d3565b505050565b60025481565b83825f8273ffffffffffffffffffffffffffffffffffffffff163b1161047e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610475906116b2565b60405180910390fd5b5f8173ffffffffffffffffffffffffffffffffffffffff163b116104d7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104ce9061171a565b60405180910390fd5b5f60015f60025481526020019081526020015f20905033815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555087816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555086816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084816003015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508581600401819055508381600501819055505f816006015f6101000a81548160ff0219169083151502179055505f8160060160016101000a81548160ff0219169083151502179055505f8160060160026101000a81548160ff0219169083151502179055508773ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff166002547f24c1f3748842b7c83474b6aa7966c8b435624ae83b0367a4d8b42f09627a07c58a898b8a6040516106bf9493929190611738565b60405180910390a460025f8154809291906106d9906117a8565b91905055505050505050505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806107a75750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b6107e6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107dd90611545565b60405180910390fd5b6107ee61128f565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff1615610854576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161084b906115ad565b60405180910390fd5b8060060160019054906101000a900460ff16156108a6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161089d90611615565b60405180910390fd5b806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e333084600501546040518463ffffffff1660e01b815260040161090a93929190611633565b5f604051808303815f87803b158015610921575f5ffd5b505af1158015610933573d5f5f3e3d5ffd5b5050505060018160060160016101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16847f988aef9037030efcc94e1c621ed73c793343d9d7445753e6de7c1674be92a31c60405160405180910390a3506109a16112d3565b505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610a655750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610aa4576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a9b90611545565b60405180910390fd5b610aac61128f565b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff1615610b12576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b0990611839565b60405180910390fd5b806006015f9054906101000a900460ff1615610bdc57806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518463ffffffff1660e01b8152600401610bae93929190611633565b5f604051808303815f87803b158015610bc5575f5ffd5b505af1158015610bd7573d5f5f3e3d5ffd5b505050505b8060060160019054906101000a900460ff1615610ca857806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600501546040518463ffffffff1660e01b8152600401610c7a93929190611633565b5f604051808303815f87803b158015610c91575f5ffd5b505af1158015610ca3573d5f5f3e3d5ffd5b505050505b60015f8581526020019081526020015f205f5f82015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600182015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600282015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600382015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600482015f9055600582015f9055600682015f6101000a81549060ff02191690556006820160016101000a81549060ff02191690556006820160026101000a81549060ff02191690555050837f0d977c6b1a383ac5ce532b4a668d0ef9ad38478e1a5ff28abb221f4b682b264360405160405180910390a250610dd26112d3565b505050565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610e965750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610ed5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ecc90611545565b60405180910390fd5b610edd61128f565b5f60015f8581526020019081526020015f209050806006015f9054906101000a900460ff16610f41576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f38906118a1565b60405180910390fd5b8060060160019054906101000a900460ff16610f92576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f8990611909565b60405180910390fd5b8060060160029054906101000a900460ff1615610fe4576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610fdb906115ad565b60405180910390fd5b806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518463ffffffff1660e01b815260040161106b93929190611633565b5f604051808303815f87803b158015611082575f5ffd5b505af1158015611094573d5f5f3e3d5ffd5b50505050806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166342842e0e30835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600501546040518463ffffffff1660e01b815260040161111e93929190611633565b5f604051808303815f87803b158015611135575f5ffd5b505af1158015611147573d5f5f3e3d5ffd5b5050505060018160060160026101000a81548160ff021916908315150217905550837f115dcb3a8fe6c704afaa7821675c7cd813fa08a3e79d90984654dd42b357649160405160405180910390a25061119e6112d3565b505050565b6001602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806004015490806005015490806006015f9054906101000a900460ff16908060060160019054906101000a900460ff16908060060160029054906101000a900460ff16905089565b60025f54036112ca576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f81905550565b60015f81905550565b5f5ffd5b5f819050919050565b6112f2816112e0565b81146112fc575f5ffd5b50565b5f8135905061130d816112e9565b92915050565b5f60208284031215611328576113276112dc565b5b5f611335848285016112ff565b91505092915050565b611347816112e0565b82525050565b5f6020820190506113605f83018461133e565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61138f82611366565b9050919050565b61139f81611385565b81146113a9575f5ffd5b50565b5f813590506113ba81611396565b92915050565b5f5f5f5f5f60a086880312156113d9576113d86112dc565b5b5f6113e6888289016113ac565b95505060206113f7888289016113ac565b9450506040611408888289016112ff565b9350506060611419888289016113ac565b925050608061142a888289016112ff565b9150509295509295909350565b61144081611385565b82525050565b5f8115159050919050565b61145a81611446565b82525050565b5f610120820190506114745f83018c611437565b611481602083018b611437565b61148e604083018a611437565b61149b6060830189611437565b6114a8608083018861133e565b6114b560a083018761133e565b6114c260c0830186611451565b6114cf60e0830185611451565b6114dd610100830184611451565b9a9950505050505050505050565b5f82825260208201905092915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f61152f600e836114eb565b915061153a826114fb565b602082019050919050565b5f6020820190508181035f83015261155c81611523565b9050919050565b7f416c7265616479206578656375746564000000000000000000000000000000005f82015250565b5f6115976010836114eb565b91506115a282611563565b602082019050919050565b5f6020820190508181035f8301526115c48161158b565b9050919050565b7f416c7265616479206465706f73697465640000000000000000000000000000005f82015250565b5f6115ff6011836114eb565b915061160a826115cb565b602082019050919050565b5f6020820190508181035f83015261162c816115f3565b9050919050565b5f6060820190506116465f830186611437565b6116536020830185611437565b611660604083018461133e565b949350505050565b7f496e76616c6964204e465420636f6e74726163742041000000000000000000005f82015250565b5f61169c6016836114eb565b91506116a782611668565b602082019050919050565b5f6020820190508181035f8301526116c981611690565b9050919050565b7f496e76616c6964204e465420636f6e74726163742042000000000000000000005f82015250565b5f6117046016836114eb565b915061170f826116d0565b602082019050919050565b5f6020820190508181035f830152611731816116f8565b9050919050565b5f60808201905061174b5f830187611437565b6117586020830186611437565b611765604083018561133e565b611772606083018461133e565b95945050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6117b2826112e0565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036117e4576117e361177b565b5b600182019050919050565b7f43616e6e6f742063616e63656c206578656375746564206f72646572000000005f82015250565b5f611823601c836114eb565b915061182e826117ef565b602082019050919050565b5f6020820190508181035f83015261185081611817565b9050919050565b7f50617274794120686173206e6f74206465706f736974656400000000000000005f82015250565b5f61188b6018836114eb565b915061189682611857565b602082019050919050565b5f6020820190508181035f8301526118b88161187f565b9050919050565b7f50617274794220686173206e6f74206465706f736974656400000000000000005f82015250565b5f6118f36018836114eb565b91506118fe826118bf565b602082019050919050565b5f6020820190508181035f830152611920816118e7565b905091905056fea26469706673582212208202254be2f8c9a3c3cde9f06adc08526bfb120bca3fa15bfc9aebfaef397dde64736f6c634300081b0033",
    solidityScanResults: {
        securityScore: 85.94,
        threatScore: 100,
        securityScoreComments: "Your Security Score is GREAT\n\nThe SolidityScan score is calculated based on lines of code and weights assigned to each issue depending on the severity and confidence. To improve your score, view the detailed result and leverage the remediation solutions provided.",
        securityScanComments: "THREAT SUMMARY\n\nYour smart contract has been assessed and assigned a Low Risk threat score. The score indicates the likelihood of risk associated with the contract code."
      }  
  },
  {
    name: "ERC20ToERC20Escrow",
    contractCode: `// SPDX-License-Identifier: MIT
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
    abi: [{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"EscrowExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"},{"indexed":false,"internalType":"address","name":"erc20ContractA","type":"address"},{"indexed":false,"internalType":"address","name":"erc20ContractB","type":"address"},{"indexed":false,"internalType":"uint256","name":"erc20AmountA","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"erc20AmountB","type":"uint256"}],"name":"EscrowOrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyA","type":"address"}],"name":"PartyADeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"partyB","type":"address"}],"name":"PartyBDeposit","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_partyB","type":"address"},{"internalType":"address","name":"_erc20ContractA","type":"address"},{"internalType":"uint256","name":"_erc20AmountA","type":"uint256"},{"internalType":"address","name":"_erc20ContractB","type":"address"},{"internalType":"uint256","name":"_erc20AmountB","type":"uint256"}],"name":"createEscrowOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositERC20ByPartyA","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"depositERC20ByPartyB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"escrowOrders","outputs":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"erc20ContractA","type":"address"},{"internalType":"address","name":"erc20ContractB","type":"address"},{"internalType":"uint256","name":"erc20AmountA","type":"uint256"},{"internalType":"uint256","name":"erc20AmountB","type":"uint256"},{"internalType":"bool","name":"partyADeposited","type":"bool"},{"internalType":"bool","name":"partyBDeposited","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}], // You'll need to fill this with the actual ABI after deployment
    bytecode: "6080604052348015600e575f5ffd5b5060015f81905550611c40806100235f395ff3fe608060405234801561000f575f5ffd5b506004361061007a575f3560e01c8063639e6afe11610059578063639e6afe146100d4578063e0182436146100f0578063ee22610b1461010c578063fa44b377146101285761007a565b8062ff36cc1461007e5780632a58b3301461009a57806352114c69146100b8575b5f5ffd5b61009860048036038101906100939190611512565b610160565b005b6100a2610473565b6040516100af919061154c565b60405180910390f35b6100d260048036038101906100cd9190611512565b610479565b005b6100ee60048036038101906100e991906115bf565b61078e565b005b61010a60048036038101906101059190611512565b610a53565b005b61012660048036038101906101219190611512565b610f2e565b005b610142600480360381019061013d9190611512565b6113a2565b6040516101579998979695949392919061165f565b60405180910390f35b61016861148e565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806102275750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610266576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161025d90611744565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff16156102cc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c3906117ac565b60405180910390fd5b806006015f9054906101000a900460ff161561031d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161031490611814565b60405180910390fd5b5f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166323b872dd333085600401546040518463ffffffff1660e01b815260040161038293929190611832565b6020604051808303815f875af115801561039e573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103c29190611891565b905080610404576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103fb90611906565b60405180910390fd5b6001826006015f6101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16857f494718383d23bb1f740e6de47978a9681b0768710ad32f6d67eef935f7809a8060405160405180910390a3505050506104706114d2565b50565b60025481565b61048161148e565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806105405750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b61057f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161057690611744565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff16156105e5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105dc906117ac565b60405180910390fd5b8060060160019054906101000a900460ff1615610637576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161062e90611814565b60405180910390fd5b5f816003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166323b872dd333085600501546040518463ffffffff1660e01b815260040161069c93929190611832565b6020604051808303815f875af11580156106b8573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906106dc9190611891565b90508061071e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161071590611906565b60405180910390fd5b60018260060160016101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16857f988aef9037030efcc94e1c621ed73c793343d9d7445753e6de7c1674be92a31c60405160405180910390a35050505061078b6114d2565b50565b835f8173ffffffffffffffffffffffffffffffffffffffff163b116107e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107df9061196e565b60405180910390fd5b825f8173ffffffffffffffffffffffffffffffffffffffff163b11610842576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108399061196e565b60405180910390fd5b5f60015f60025481526020019081526020015f20905033815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555087816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555086816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084816003015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508581600401819055508381600501819055505f816006015f6101000a81548160ff0219169083151502179055505f8160060160016101000a81548160ff0219169083151502179055505f8160060160026101000a81548160ff0219169083151502179055508773ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff166002547f24c1f3748842b7c83474b6aa7966c8b435624ae83b0367a4d8b42f09627a07c58a898b8a604051610a2a949392919061198c565b60405180910390a460025f815480929190610a44906119fc565b91905055505050505050505050565b610a5b61148e565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610b1a5750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610b59576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b5090611744565b60405180910390fd5b5f60015f8581526020019081526020015f2090508060060160029054906101000a900460ff1615610bbf576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bb690611a8d565b60405180910390fd5b806006015f9054906101000a900460ff1615610cde575f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518363ffffffff1660e01b8152600401610c5a929190611aab565b6020604051808303815f875af1158015610c76573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610c9a9190611891565b905080610cdc576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610cd390611b1c565b60405180910390fd5b505b8060060160019054906101000a900460ff1615610dff575f816003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600501546040518363ffffffff1660e01b8152600401610d7b929190611aab565b6020604051808303815f875af1158015610d97573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610dbb9190611891565b905080610dfd576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610df490611b1c565b60405180910390fd5b505b60015f8581526020019081526020015f205f5f82015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600182015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600282015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600382015f6101000a81549073ffffffffffffffffffffffffffffffffffffffff0219169055600482015f9055600582015f9055600682015f6101000a81549060ff02191690556006820160016101000a81549060ff02191690556006820160026101000a81549060ff02191690555050837f0d977c6b1a383ac5ce532b4a668d0ef9ad38478e1a5ff28abb221f4b682b264360405160405180910390a2505050610f2b6114d2565b50565b610f3661148e565b805f60015f8381526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610ff55750806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b611034576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161102b90611744565b60405180910390fd5b5f60015f8581526020019081526020015f209050806006015f9054906101000a900460ff16611098576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161108f90611b84565b60405180910390fd5b8060060160019054906101000a900460ff166110e9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110e090611bec565b60405180910390fd5b8060060160029054906101000a900460ff161561113b576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611132906117ac565b60405180910390fd5b5f816002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb836001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600401546040518363ffffffff1660e01b81526004016111c1929190611aab565b6020604051808303815f875af11580156111dd573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906112019190611891565b905080611243576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161123a90611906565b60405180910390fd5b816003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb835f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684600501546040518363ffffffff1660e01b81526004016112c7929190611aab565b6020604051808303815f875af11580156112e3573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906113079190611891565b905080611349576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161134090611906565b60405180910390fd5b60018260060160026101000a81548160ff021916908315150217905550847f115dcb3a8fe6c704afaa7821675c7cd813fa08a3e79d90984654dd42b357649160405160405180910390a25050505061139f6114d2565b50565b6001602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806003015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806004015490806005015490806006015f9054906101000a900460ff16908060060160019054906101000a900460ff16908060060160029054906101000a900460ff16905089565b60025f54036114c9576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60025f81905550565b60015f81905550565b5f5ffd5b5f819050919050565b6114f1816114df565b81146114fb575f5ffd5b50565b5f8135905061150c816114e8565b92915050565b5f60208284031215611527576115266114db565b5b5f611534848285016114fe565b91505092915050565b611546816114df565b82525050565b5f60208201905061155f5f83018461153d565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61158e82611565565b9050919050565b61159e81611584565b81146115a8575f5ffd5b50565b5f813590506115b981611595565b92915050565b5f5f5f5f5f60a086880312156115d8576115d76114db565b5b5f6115e5888289016115ab565b95505060206115f6888289016115ab565b9450506040611607888289016114fe565b9350506060611618888289016115ab565b9250506080611629888289016114fe565b9150509295509295909350565b61163f81611584565b82525050565b5f8115159050919050565b61165981611645565b82525050565b5f610120820190506116735f83018c611636565b611680602083018b611636565b61168d604083018a611636565b61169a6060830189611636565b6116a7608083018861153d565b6116b460a083018761153d565b6116c160c0830186611650565b6116ce60e0830185611650565b6116dc610100830184611650565b9a9950505050505050505050565b5f82825260208201905092915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f61172e600e836116ea565b9150611739826116fa565b602082019050919050565b5f6020820190508181035f83015261175b81611722565b9050919050565b7f416c7265616479206578656375746564000000000000000000000000000000005f82015250565b5f6117966010836116ea565b91506117a182611762565b602082019050919050565b5f6020820190508181035f8301526117c38161178a565b9050919050565b7f416c7265616479206465706f73697465640000000000000000000000000000005f82015250565b5f6117fe6011836116ea565b9150611809826117ca565b602082019050919050565b5f6020820190508181035f83015261182b816117f2565b9050919050565b5f6060820190506118455f830186611636565b6118526020830185611636565b61185f604083018461153d565b949350505050565b61187081611645565b811461187a575f5ffd5b50565b5f8151905061188b81611867565b92915050565b5f602082840312156118a6576118a56114db565b5b5f6118b38482850161187d565b91505092915050565b7f4552433230207472616e73666572206661696c656400000000000000000000005f82015250565b5f6118f06015836116ea565b91506118fb826118bc565b602082019050919050565b5f6020820190508181035f83015261191d816118e4565b9050919050565b7f496e76616c696420455243323020636f6e7472616374000000000000000000005f82015250565b5f6119586016836116ea565b915061196382611924565b602082019050919050565b5f6020820190508181035f8301526119858161194c565b9050919050565b5f60808201905061199f5f830187611636565b6119ac6020830186611636565b6119b9604083018561153d565b6119c6606083018461153d565b95945050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f611a06826114df565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203611a3857611a376119cf565b5b600182019050919050565b7f43616e6e6f742063616e63656c206578656375746564206f72646572000000005f82015250565b5f611a77601c836116ea565b9150611a8282611a43565b602082019050919050565b5f6020820190508181035f830152611aa481611a6b565b9050919050565b5f604082019050611abe5f830185611636565b611acb602083018461153d565b9392505050565b7f455243323020726566756e64206661696c6564000000000000000000000000005f82015250565b5f611b066013836116ea565b9150611b1182611ad2565b602082019050919050565b5f6020820190508181035f830152611b3381611afa565b9050919050565b7f50617274794120686173206e6f74206465706f736974656400000000000000005f82015250565b5f611b6e6018836116ea565b9150611b7982611b3a565b602082019050919050565b5f6020820190508181035f830152611b9b81611b62565b9050919050565b7f50617274794220686173206e6f74206465706f736974656400000000000000005f82015250565b5f611bd66018836116ea565b9150611be182611ba2565b602082019050919050565b5f6020820190508181035f830152611c0381611bca565b905091905056fea2646970667358221220360c5e52e2bb60e26186ec6052591e269c68fa087298b7c99aabe331d78c471c64736f6c634300081b0033",
    solidityScanResults: {
        securityScore: 86.34,
        threatScore: 100,
        securityScoreComments: "Your Security Score is GREAT\n\nThe SolidityScan score is calculated based on lines of code and weights assigned to each issue depending on the severity and confidence. To improve your score, view the detailed result and leverage the remediation solutions provided.",
        securityScanComments: "THREAT SUMMARY\n\nYour smart contract has been assessed and assigned a Low Risk threat score. The score indicates the likelihood of risk associated with the contract code."
      } 
  }
];