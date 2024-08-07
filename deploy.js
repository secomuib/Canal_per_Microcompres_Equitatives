const path = require("path");
const fs = require("fs-extra"); // fs with extra functions
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require('web3');

const compiledContractPath = './src/ethereum/build/factoryChannel.json';
const compiledContract = require(compiledContractPath);

// Mnemonic from a test account and an Infura provider
  const provider = new HDWalletProvider(
    'tragic square news business dad cricket nurse athlete tide split about ring',
    'https://sepolia.infura.io/v3/6c6c7356844a424e9c277e665ac7e109'
  );
  
const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account', accounts[0]);

  // We deploy the smart contract to the Rinkeby test network
  let result;
  try{
    result = await new web3.eth.Contract(compiledContract.abi)
    .deploy({ data: compiledContract.evm.bytecode.object, arguments: [] })
    .send({ from: accounts[0], gas: '3000000' });
  } catch(e){
    console.log(e);
  }
  
  console.log('result', result);
  // fs.writeFileSync('./CONTRACTADDRESS', result.options.address);
  compiledContract.address = result.options.address;

  fs.outputJsonSync(
    path.resolve(__dirname, compiledContractPath),
    compiledContract,
    {spaces: 2} // Indent json output with 2 spaces
  );
  
  console.log('Contract deployed to Rinkeby network, at address ', result.options.address);
 
};

deploy();
