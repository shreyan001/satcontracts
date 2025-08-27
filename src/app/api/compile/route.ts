import { NextResponse } from 'next/server';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { flatternFile } from '@ericxstone/sol-flattener';

// Use default solc compiler to avoid timeout issues
const compiler = solc;

// Initialize compiler (now just returns the default solc)
async function initializeCompiler() {
  console.log('✅ Using default Solidity compiler');
  return compiler;
}

// Enhanced error handling and logging
function logCompilationStep(step: string, data?: any) {
  console.log(`🔧 [Compilation] ${step}`, data ? JSON.stringify(data, null, 2) : '');
}

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

// Enhanced contract flattening with OpenZeppelin dependency resolution
async function flattenContract(sourceCode: string, contractName: string = 'Contract'): Promise<string> {
  try {
    logCompilationStep('Starting contract flattening using sol-flattener');
    
    // Create temporary directory for flattening process
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempContractPath = path.join(tempDir, `${contractName}.sol`);
    
    // Write source code to temporary file
    fs.writeFileSync(tempContractPath, sourceCode, 'utf8');
    
    try {
      // Use sol-flattener to flatten the contract (same as chainup route)
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      let flattenedCode = flatternFile(tempContractPath, nodeModulesPath);
      
      // Post-process to resolve remaining OpenZeppelin dependencies
      flattenedCode = resolveOpenZeppelinDependencies(flattenedCode);
      
      logCompilationStep('Contract flattened successfully', { 
        originalLength: sourceCode.length,
        flattenedLength: flattenedCode.length,
        hasRemainingImports: flattenedCode.includes('import ')
      });
      
      // Clean up temporary files
      if (fs.existsSync(tempContractPath)) fs.unlinkSync(tempContractPath);
      
      return flattenedCode;
      
    } catch (flattenError) {
      logCompilationStep('Flattening failed, returning original source', { error: flattenError });
      // Clean up on error
      if (fs.existsSync(tempContractPath)) fs.unlinkSync(tempContractPath);
      
      // Return original source code if flattening fails
      return sourceCode;
    }
    
  } catch (error) {
    logCompilationStep('Flattening process error', { error });
    return sourceCode;
  }
}

// This function is now only used as a post-processing step after flattening
// The main dependency resolution is handled by the sol-flattener library

// Enhanced compilation function with better error handling
async function compileContract(sourceCode: string, useFlattening: boolean = true, contractName: string = 'Contract') {
  try {
    logCompilationStep('Starting compilation process', { useFlattening, contractName });
    
    // Extract the actual contract name from source code if not provided
    if (contractName === 'Contract') {
      const contractMatch = sourceCode.match(/contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:is\s+[^{]*)?\s*\{/);
      if (contractMatch) {
        contractName = contractMatch[1];
        logCompilationStep('Extracted contract name from source', { contractName });
      }
    }
    
    const sourceName = `${contractName}.sol`;
    const sources: { [key: string]: { content: string } } = {
      [sourceName]: {
        content: sourceCode,
      },
    };

    // Note: Dependencies should already be resolved through flattening process
    logCompilationStep('Using flattened source code for compilation', { 
      sourceLength: sourceCode.length 
    });

    const input = {
      language: 'Solidity',
      sources,
      settings: {
        remappings: [
          '@openzeppelin/contracts/=@openzeppelin/contracts/'
        ],
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'],
          },
        },
        evmVersion: 'paris'
      },
    };
    
    // Get the compiler instance
    const compilerInstance = await initializeCompiler();
    
    logCompilationStep('Compiling with solc', { sourcesCount: Object.keys(sources).length });
    const compiledContract = JSON.parse(compilerInstance.compile(JSON.stringify(input)));
    
    // Enhanced error handling
    if (compiledContract.errors) {
      const errors = compiledContract.errors.filter((error: any) => error.severity === 'error');
      const warnings = compiledContract.errors.filter((error: any) => error.severity === 'warning');
      
      logCompilationStep('Compilation issues found', { 
        errorCount: errors.length, 
        warningCount: warnings.length 
      });
      
      if (errors.length > 0) {
        return {
          success: false,
          errors: errors.map((error: any) => ({
            message: error.message,
            severity: error.severity,
            sourceLocation: error.sourceLocation,
            type: error.type,
            component: error.component
          })),
          warnings: warnings.map((warning: any) => ({
            message: warning.message,
            severity: warning.severity,
            sourceLocation: warning.sourceLocation,
            type: warning.type
          }))
        };
      }
    }
    
    // Validate compilation output
    const sourceFiles = Object.keys(compiledContract.contracts || {});
    if (sourceFiles.length === 0) {
      logCompilationStep('No contracts generated');
      return {
        success: false,
        errors: [{ message: 'No contracts were generated from the source code', severity: 'error' }],
        warnings: []
      };
    }
    
    // Find the source file that contains our contract
    const targetSourceFile = sourceFiles.find(file => file === sourceName) || sourceFiles[0];
    const contractsInSourceFile = compiledContract.contracts[targetSourceFile];
    const availableContractNames = Object.keys(contractsInSourceFile);
    
    if (availableContractNames.length === 0) {
      return {
        success: false,
        errors: [{ message: 'No contract found in the source code', severity: 'error' }],
        warnings: []
      };
    }
    
    // Try to find the specific contract, or use the first one if not found
    let finalContractName = contractName;
    let contract = contractsInSourceFile[contractName];
    if (!contract) {
      logCompilationStep('Contract not found, using first available', { 
        requested: contractName, 
        available: availableContractNames 
      });
      finalContractName = availableContractNames[0];
      contract = contractsInSourceFile[finalContractName];
    }
    
    const contractABI = contract.abi;
    const bytecode = contract.evm.bytecode.object;
    const deployedBytecode = contract.evm.deployedBytecode?.object;
    const metadata = contract.metadata;
    
    logCompilationStep('Compilation successful', { 
      contractName: finalContractName, 
      abiLength: contractABI.length, 
      bytecodeLength: bytecode.length,
      hasDeployedBytecode: !!deployedBytecode
    });
    
    return { 
      success: true,
      abi: contractABI, 
      bytecode,
      deployedBytecode,
      metadata: metadata ? JSON.parse(metadata) : null,
      contractName: finalContractName,
      warnings: compiledContract.errors ? 
       compiledContract.errors
         .filter((error: any) => error.severity === 'warning')
         .map((warning: any) => ({
           message: warning.message,
           severity: warning.severity,
           sourceLocation: warning.sourceLocation,
           type: warning.type
         })) : []
   };
  } catch (error) {
    logCompilationStep('Compilation error', { error });
    return {
      success: false,
      errors: [{ 
        message: `Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      }],
      warnings: []
    };
  }
}

export async function POST(request: Request) {
  try {
    const { sourceCode, contractName = 'Contract', useFlattening = false } = await request.json();
    
    if (!sourceCode) {
      return NextResponse.json(
        { error: 'Source code is required' },
        { status: 400 }
      );
    }

    logCompilationStep('Starting unified compilation process', { contractName, useFlattening });

    let processedSourceCode = sourceCode;
    
    // Apply flattening if requested
    if (useFlattening) {
      logCompilationStep('Flattening requested, processing contract');
      processedSourceCode = await flattenContract(sourceCode, contractName);
      
      // Log flattening results
      const hasImports = processedSourceCode.includes('import ');
      logCompilationStep('Flattening completed', { 
        originalLength: sourceCode.length,
        flattenedLength: processedSourceCode.length,
        hasRemainingImports: hasImports
      });
    }

    // Initialize the compiler with the correct version
    const compilerInstance = await initializeCompiler();
    
    // Compile the processed contract
    const result = await compileContract(processedSourceCode, true, contractName);
     
     if (result.success) {
       logCompilationStep('Compilation completed successfully');
       return NextResponse.json({
         success: true,
         abi: result.abi,
         bytecode: result.bytecode,
         deployedBytecode: result.deployedBytecode,
         metadata: result.metadata,
         contractName: result.contractName,
         warnings: result.warnings || [],
         flattened: useFlattening,
         flattenedSource: useFlattening ? processedSourceCode : undefined
       });
     } else {
       logCompilationStep('Compilation failed', { errors: result.errors });
       return NextResponse.json(
         { 
           success: false, 
           error: 'Compilation failed', 
           details: result.errors,
           flattened: useFlattening,
           flattenedSource: useFlattening ? processedSourceCode : undefined
         },
         { status: 400 }
       );
     }
  } catch (error) {
    logCompilationStep('API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
