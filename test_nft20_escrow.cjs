const fs = require('fs');
const path = require('path');

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const CONTRACT_NAME = 'NFT20Escrow';

// NFT20Escrow contract from contractIndex.ts
const NFT20_ESCROW_CONTRACT = `// SPDX-License-Identifier: MIT
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
}`;

async function testContractCompilation() {
    console.log('🧪 Testing NFT20Escrow Contract Compilation');
    console.log('=' .repeat(50));
    
    const testResults = {
        contractName: CONTRACT_NAME,
        timestamp: new Date().toISOString(),
        tests: []
    };
    
    try {
        // Test 1: Check if contract has imports requiring flattening
        console.log('\n📋 Test 1: Analyzing contract imports');
        const hasImports = NFT20_ESCROW_CONTRACT.includes('import ');
        const importMatches = NFT20_ESCROW_CONTRACT.match(/import\s+["'][^"']+["'];/g) || [];
        
        console.log(`   - Has imports: ${hasImports}`);
        console.log(`   - Import count: ${importMatches.length}`);
        importMatches.forEach((imp, idx) => {
            console.log(`   - Import ${idx + 1}: ${imp}`);
        });
        
        testResults.tests.push({
            name: 'Import Analysis',
            passed: hasImports,
            details: {
                hasImports,
                importCount: importMatches.length,
                imports: importMatches
            }
        });
        
        // Test 2: Compile without flattening (should fail)
        console.log('\n🔧 Test 2: Compiling without flattening');
        try {
            const response = await fetch(`${API_BASE_URL}/api/compile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceCode: NFT20_ESCROW_CONTRACT,
                    contractName: CONTRACT_NAME,
                    useFlattening: false
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('   ❌ Unexpected success - should have failed without flattening');
                testResults.tests.push({
                    name: 'Compile Without Flattening',
                    passed: false,
                    details: { message: 'Should have failed but succeeded', result }
                });
            } else {
                console.log('   ✅ Expected failure - compilation failed without flattening');
                console.log(`   - Error: ${result.error}`);
                testResults.tests.push({
                    name: 'Compile Without Flattening',
                    passed: true,
                    details: { message: 'Expected failure occurred', error: result.error }
                });
            }
        } catch (error) {
            console.log('   ✅ Expected failure - network/parsing error');
            console.log(`   - Error: ${error.message}`);
            testResults.tests.push({
                name: 'Compile Without Flattening',
                passed: true,
                details: { message: 'Expected failure occurred', error: error.message }
            });
        }
        
        // Test 3: Compile with flattening (should succeed)
        console.log('\n🔧 Test 3: Compiling with flattening');
        try {
            const response = await fetch(`${API_BASE_URL}/api/compile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceCode: NFT20_ESCROW_CONTRACT,
                    contractName: CONTRACT_NAME,
                    useFlattening: true
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('   ✅ Compilation successful with flattening');
                console.log(`   - ABI functions: ${result.abi ? result.abi.length : 0}`);
                console.log(`   - Bytecode length: ${result.bytecode ? result.bytecode.length : 0}`);
                console.log(`   - Contract name: ${result.contractName}`);
                console.log(`   - Warnings: ${result.warnings ? result.warnings.length : 0}`);
                
                // Verify expected functions exist
                const expectedFunctions = [
                    'createEscrowOrder',
                    'depositERC20',
                    'depositNFT',
                    'executeTransaction',
                    'cancelEscrow'
                ];
                
                const abiNames = result.abi ? result.abi.map(item => item.name).filter(Boolean) : [];
                const foundFunctions = expectedFunctions.filter(func => abiNames.includes(func));
                
                console.log(`   - Expected functions found: ${foundFunctions.length}/${expectedFunctions.length}`);
                foundFunctions.forEach(func => console.log(`     ✓ ${func}`));
                
                testResults.tests.push({
                    name: 'Compile With Flattening',
                    passed: true,
                    details: {
                        abiLength: result.abi ? result.abi.length : 0,
                        bytecodeLength: result.bytecode ? result.bytecode.length : 0,
                        contractName: result.contractName,
                        warningsCount: result.warnings ? result.warnings.length : 0,
                        expectedFunctions: foundFunctions.length,
                        totalFunctions: expectedFunctions.length,
                        foundFunctions
                    }
                });
            } else {
                console.log('   ❌ Compilation failed with flattening');
                console.log(`   - Error: ${result.error}`);
                if (result.details) {
                    console.log('   - Details:', JSON.stringify(result.details, null, 2));
                }
                testResults.tests.push({
                    name: 'Compile With Flattening',
                    passed: false,
                    details: { error: result.error, details: result.details }
                });
            }
        } catch (error) {
            console.log('   ❌ Compilation failed with error');
            console.log(`   - Error: ${error.message}`);
            testResults.tests.push({
                name: 'Compile With Flattening',
                passed: false,
                details: { error: error.message }
            });
        }
        
        // Test 4: Test the current ContractUI approach (without useFlattening)
        console.log('\n🔧 Test 4: Testing current ContractUI approach');
        try {
            const response = await fetch(`${API_BASE_URL}/api/compile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceCode: NFT20_ESCROW_CONTRACT
                    // Note: No useFlattening parameter, mimicking current ContractUI
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('   ⚠️  Unexpected success with ContractUI approach');
                console.log('   - This suggests the backend handles missing useFlattening parameter');
                testResults.tests.push({
                    name: 'ContractUI Approach',
                    passed: true,
                    details: { message: 'Succeeded without explicit useFlattening', result }
                });
            } else {
                console.log('   ❌ Failed with ContractUI approach (as expected)');
                console.log(`   - Error: ${result.error}`);
                testResults.tests.push({
                    name: 'ContractUI Approach',
                    passed: false,
                    details: { error: result.error, message: 'Failed as expected without useFlattening' }
                });
            }
        } catch (error) {
            console.log('   ❌ ContractUI approach failed with error');
            console.log(`   - Error: ${error.message}`);
            testResults.tests.push({
                name: 'ContractUI Approach',
                passed: false,
                details: { error: error.message }
            });
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        testResults.tests.push({
            name: 'Test Execution',
            passed: false,
            details: { error: error.message }
        });
    }
    
    // Save test results
    const resultsPath = path.join(process.cwd(), 'nft20_escrow_test_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    
    console.log('\n📊 Test Summary');
    console.log('=' .repeat(50));
    const passedTests = testResults.tests.filter(test => test.passed).length;
    const totalTests = testResults.tests.length;
    console.log(`Tests passed: ${passedTests}/${totalTests}`);
    console.log(`Results saved to: ${resultsPath}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n⚠️  Some tests failed. Check the results for details.');
    }
}

// Run the test
testContractCompilation().catch(console.error);