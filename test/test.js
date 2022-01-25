const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Channel contract", function (){

  let channel; 

  it("It deploys channelFactory smart contract", async function () {
    channel = await ethers.getContractFactory('factoryChannel');
    channel = await channel.deploy(); 
    await channel.deployed();

    expect(channel.address).to.not.be.undefined; 
  })

  it("New channel deployment", async function () {
    const _c = 2;
    const _v = 1;
    
    const newChannel = await channel.createChannel(_c, _v);

    const channelInfo = await channel.getChannels(0);
    console.log(channelInfo);
    console.log(newChannel);
    //expect(channelInfo).to.be.equal(newChannel.address);
  })

})
