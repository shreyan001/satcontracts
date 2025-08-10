import { NextResponse } from 'next/server';
import solc from 'solc';

export async function POST(request: Request) {
  try {
    const { sourceCode } = await request.json();

    if (!sourceCode) {
      return NextResponse.json({ error: 'No source code provided' }, { status: 400 });
    }

    const result = compileContract(sourceCode);
    
    if (result.success) {
      return NextResponse.json({ abi: result.abi, bytecode: result.bytecode });
    } else {
      console.error('Compilation failed:', result.errors);
      return NextResponse.json({ 
        error: 'Compilation failed', 
        details: result.errors,
        warnings: result.warnings || []
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Server error during compilation:', error);
    return NextResponse.json({ 
      error: 'Server error during compilation', 
      details: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}

function compileContract(sourceCode: string) {
  const input = {
    language: 'Solidity',
    sources: {
      'Contract.sol': {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };
  
  const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));
  console.log('🔧 Backend compilation result:', compiledContract);
  
  // Check for compilation errors
  if (compiledContract.errors) {
    const errors = compiledContract.errors.filter((error: any) => error.severity === 'error');
    const warnings = compiledContract.errors.filter((error: any) => error.severity === 'warning');
    
    if (errors.length > 0) {
      console.error('❌ Backend compilation errors:', errors);
      return {
        success: false,
        errors: errors.map((error: any) => ({
          message: error.message,
          severity: error.severity,
          sourceLocation: error.sourceLocation,
          type: error.type
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
  
  // Check if contracts were generated
  if (!compiledContract.contracts || !compiledContract.contracts['Contract.sol']) {
    console.error('❌ Backend: No contracts generated');
    return {
      success: false,
      errors: [{ message: 'No contracts were generated from the source code', severity: 'error' }],
      warnings: []
    };
  }
  
  const contractName = Object.keys(compiledContract.contracts['Contract.sol'])[0];
  if (!contractName) {
    console.error('❌ Backend: No contract name found');
    return {
      success: false,
      errors: [{ message: 'No contract found in the source code', severity: 'error' }],
      warnings: []
    };
  }
  
  const contractABI = compiledContract.contracts['Contract.sol'][contractName].abi;
  const bytecode = compiledContract.contracts['Contract.sol'][contractName].evm.bytecode.object;
  
  console.log('✅ Backend compilation successful:', { contractName, abiLength: contractABI.length, bytecodeLength: bytecode.length });
  
  return { 
    success: true,
    abi: contractABI, 
    bytecode,
    warnings: compiledContract.errors ? compiledContract.errors.filter((error: any) => error.severity === 'warning').map((warning: any) => ({
      message: warning.message,
      severity: warning.severity,
      sourceLocation: warning.sourceLocation,
      type: warning.type
    })) : []
  };
}
