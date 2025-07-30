import { NextResponse } from 'next/server';
import solc from 'solc';

export async function POST(request: Request) {
  try {
    const { sourceCode } = await request.json();

    if (!sourceCode) {
      return NextResponse.json({ error: 'No source code provided' }, { status: 400 });
    }

    const { abi, bytecode } = compileContract(sourceCode);

    return NextResponse.json({ abi, bytecode });
  } catch (error) {
    console.error('Compilation error:', error);
    return NextResponse.json({ error: 'Compilation failed' }, { status: 500 });
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
  console.log(compiledContract)
  const contractName = Object.keys(compiledContract.contracts['Contract.sol'])[0];
  const contractABI = compiledContract.contracts['Contract.sol'][contractName].abi;
  const bytecode = compiledContract.contracts['Contract.sol'][contractName].evm.bytecode.object;

  return { abi: contractABI, bytecode };
}
