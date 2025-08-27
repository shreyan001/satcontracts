import { NextRequest, NextResponse } from 'next/server';
import { flatternFile } from '@ericxstone/sol-flattener';
import * as fs from 'fs';
import * as path from 'path';

// OpenZeppelin dependency resolver
function resolveOpenZeppelinDependencies(contractSource: string): string {
  let resolvedSource = contractSource;
  
  // Define OpenZeppelin contracts that need to be resolved
  const ozDependencies = {
    'import {IERC165} from "../../utils/introspection/IERC165.sol";': `/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * \`interfaceId\`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}`,
    'import {Context} from "../utils/Context.sol";': `/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}`
  };
  
  // Replace import statements with actual contract code
  for (const [importStatement, contractCode] of Object.entries(ozDependencies)) {
    if (resolvedSource.includes(importStatement)) {
      resolvedSource = resolvedSource.replace(importStatement, contractCode);
    }
  }
  
  return resolvedSource;
}

// Helper function to flatten contract source code
function flattenContractSource(sourceCode: string, contractName: string): string {
  try {
    // Create a temporary directory for the contract
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write the source code to a temporary file
    const tempFilePath = path.join(tempDir, `${contractName}.sol`);
    fs.writeFileSync(tempFilePath, sourceCode);
    
    // Flatten the contract
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    let flattenedCode = flatternFile(tempFilePath, nodeModulesPath);
    
    // Post-process to resolve remaining OpenZeppelin dependencies
    flattenedCode = resolveOpenZeppelinDependencies(flattenedCode);
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    return flattenedCode;
  } catch (error) {
    console.error('Error flattening contract:', error);
    // Return original source code if flattening fails
    return sourceCode;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  console.log('🔍 GET request received for chainup endpoint with address:', address);
  
  if (!address) {
    return NextResponse.json({
      success: false,
      error: 'Address parameter is required',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }

  try {
    // Check verification status using Citrea testnet explorer v2 API
    const response = await fetch(
      `https://explorer.testnet.citrea.xyz/api/v2/smart-contracts/${address}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    console.log('📡 Blockscout API response status:', response.status);

    if (!response.ok) {
      // Don't return 404, return success with status info
      return NextResponse.json({
        success: true,
        address: address,
        isVerified: false,
        verificationStatus: 'not_found',
        message: `Contract not found on Citrea explorer (status: ${response.status})`,
        blockscoutUrl: `https://explorer.testnet.citrea.xyz/address/${address}`,
        timestamp: new Date().toISOString()
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      address: address,
      isVerified: data.is_verified || false,
      verificationStatus: data.verification_status || 'unknown',
      blockscoutUrl: `https://explorer.testnet.citrea.xyz/address/${address}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check verification status',
      details: error instanceof Error ? error.message : 'Unknown error',
      address: address,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, sourceCode } = body;
    
    console.log('🔍 POST request received for chainup endpoint with body:', {
      contractAddress,
      sourceCodeLength: sourceCode?.length
    });
    
    // Validate required fields
    if (!contractAddress || !sourceCode) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: contractAddress and sourceCode',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Extract contract name from source code
    const contractNameMatch = sourceCode.match(/contract\s+(\w+)/);
    const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';
    
    // Extract compiler version from pragma
    const pragmaMatch = sourceCode.match(/pragma\s+solidity\s+([^;]+);/);
    let compilerVersion = 'v0.8.19+commit.7dd6d404'; // default
    if (pragmaMatch) {
      const version = pragmaMatch[1].replace(/[^\d\.]/g, '');
      if (version) {
        compilerVersion = `v${version}+commit.7dd6d404`;
      }
    }

    console.log('📋 Extracted info:', {
      contractName,
      compilerVersion,
      contractAddress
    });

    // Flatten the contract source code
    console.log('Flattening contract source code...');
    const flattenedSourceCode = flattenContractSource(sourceCode, contractName);

    // Try Citrea explorer v2 API first (preferred method)
    try {
      const v2Response = await fetch(
        `https://explorer.testnet.citrea.xyz/api/v2/smart-contracts/${contractAddress}/verification/via/flattened-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            compiler_version: compilerVersion,
            license_type: 'mit',
            source_code: flattenedSourceCode,
            is_optimization_enabled: false,
            optimization_runs: 200,
            contract_name: contractName,
            libraries: {},
            evm_version: 'default',
            autodetect_constructor_args: true
          })
        }
      );

      console.log('📡 Citrea explorer v2 API response status:', v2Response.status);

      if (v2Response.ok) {
        const result = await v2Response.json();
        console.log('✅ v2 API verification successful:', result);

        return NextResponse.json({
          success: true,
          method: 'v2_api',
          result: result,
          blockscoutUrl: `https://explorer.testnet.citrea.xyz/address/${contractAddress}`,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorText = await v2Response.text();
        console.log('⚠️ v2 API failed, trying RPC method. Error:', errorText);
        
        // If v2 API fails, try RPC method instead of returning error immediately
      }
    } catch (v2Error) {
      console.log('⚠️ v2 API error, trying RPC method:', v2Error);
    }

    // Fallback to RPC API method
    try {
      const rpcParams = new URLSearchParams({
        module: 'contract',
        action: 'verify',
        addressHash: contractAddress,
        name: contractName,
        compilerVersion: compilerVersion,
        optimization: '0',
        contractSourceCode: flattenedSourceCode
      });

      rpcParams.append('autodetectConstructorArguments', 'true');
      rpcParams.append('evmVersion', 'default');
      rpcParams.append('optimizationRuns', '200');

      const rpcResponse = await fetch(
        `https://explorer.testnet.citrea.xyz/api?${rpcParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      console.log('📡 Citrea explorer RPC response status:', rpcResponse.status);

      if (rpcResponse.ok) {
        const rpcResult = await rpcResponse.json();
        console.log('✅ RPC verification result:', rpcResult);

        return NextResponse.json({
          success: true,
          method: 'rpc_api',
          result: rpcResult,
          blockscoutUrl: `https://explorer.testnet.citrea.xyz/address/${contractAddress}`,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorText = await rpcResponse.text();
        console.error('❌ RPC verification failed:', errorText);
        
        // Return success with failure details instead of error status
        return NextResponse.json({
          success: false,
          error: 'Verification failed with both v2 API and RPC methods',
          details: errorText,
          blockscoutStatus: rpcResponse.status,
          addressHash: contractAddress,
          timestamp: new Date().toISOString()
        });
      }
    } catch (rpcError) {
      console.error('❌ RPC method error:', rpcError);
      
      return NextResponse.json({
        success: false,
        error: 'Both verification methods failed',
        details: rpcError instanceof Error ? rpcError.message : 'Unknown RPC error',
        addressHash: contractAddress,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error in POST endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}