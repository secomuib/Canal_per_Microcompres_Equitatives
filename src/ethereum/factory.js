import web3 from './web3';

//const path = require("path");
//const fs = require("fs-extra"); // fs with extra functions

const channelFactory = require('./build/factoryChannel.json');

const instance = new web3.eth.Contract(
    channelFactory.abi,
    channelFactory.address
);

export default instance;