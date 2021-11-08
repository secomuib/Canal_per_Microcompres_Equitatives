import web3 from './web3';

const Channel = require('./build/channel.json');

export default (address) => {
    return new web3.eth.Contract(
        Channel.abi,
        address
    );
}