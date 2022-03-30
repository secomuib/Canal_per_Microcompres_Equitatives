const { expect } = require("chai");
const { ethers } = require("hardhat");

const sha256 = require('js-sha256');

const elliptic = require('elliptic');
const ecies = require('ecies-geth');
const { BigNumber } = require("ethers");

describe("Channel contract", function (){
  let channelFactory, channel1, channel2;
  let W_LM, W_0M, W_LC, W_0C; 
  let T_exp, T_D, T_R;

  //Function that calculates the hash chains, as parameters we have the hash (sha256), the 'c' value and finally the 'k'.
  function W (W_X, c, k){

    var W= Buffer.from(W_X,'hex'); 

    let L = 2 * (c) + 1;
      for (L; L != k; L--) {
          W = sha256(W);
          W = Buffer.from(W, 'hex');
      }
    W = Buffer.from(W).toString("hex");
    return W;
  };
  
  //Function used when we need to wait a time period to execute some transaction.
  function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  };

  it("Address assignment", async function(){
    [user1, user2, user3] = await ethers.getSigners();
  });

  it("Deploys channelFactory smart contract", async function () {
    //Deploy the channelFactory smart contract
    channelFactory = await ethers.getContractFactory('factoryChannel');
    channelFactory = await channelFactory.deploy();
    await channelFactory.deployed();

    expect(channelFactory.address).to.not.be.undefined;
  });

  it("New channel deployment", async function () {
    const _c = 2;
    const _v = ethers.utils.parseEther("0.002");
    const value = (_c*_v).toString();

    //Create a new channel owned by user1, deployed from the channel smart contract
    await channelFactory.connect(user1)["createChannel(uint256,uint256)"](_c, _v, { value: value});

    const user1Channels = await channelFactory.getOwnerChannels(user1.address);
    const channelAddress = await channelFactory.getChannels(0);
    
    expect(user1Channels[0]).to.not.be.undefined;
    expect(user1Channels[0]).to.be.equal(channelAddress);

    //Review user1Channel customer: 
    const channelSC = await ethers.getContractFactory('channel');
    channel1 = channelSC.attach(user1Channels[0]);

    expect(await channel1.connect(user1).customer()).to.be.equal(user1.address);

    //Review user1Channel parameters (c & v)
    expect(await channel1.connect(user1).c()).to.be.equal(_c);
    expect(await channel1.connect(user1).v()).to.be.equal(_v);

    //Review user1Channel balance
    expect(await ethers.provider.getBalance(channel1.address)).to.be.equal((_c*_v).toString());
  });

  it("Set channel params configuration", async function () {
    let c = await channel1.connect(user1).c();
    let v = await channel1.connect(user1).v();

    //Create W_LM, W_LC and respectives W_0M, W_0C
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM, c, 0);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC, c, 0);
    
    //Define T_exp = now + 15s
    T_exp = Date.now() + 15000; // Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000) // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + TD
    T_D = 10;

    //Define T_R = 30s --> it would be T_exp + TD + TR
    T_R = 30;

    //Execute setChannelParams()
    await channel1.connect(user1).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);
  });


  it("Review channel params configuration", async function(){
    const w_jm = await channel1.connect(user1).W_jm();
    expect(w_jm).to.be.equal('0x'+W_0M);

    const w_jc = await channel1.connect(user1).W_jc();
    expect(w_jc).to.be.equal('0x'+W_0C);

    const t_exp = await channel1.connect(user1).T_exp();
    expect(t_exp).to.be.equal(T_exp);

    const td = await channel1.connect(user1).TD();
    expect(td).to.be.equal(T_D);

    const tr = await channel1.connect(user1).TR();
    expect(tr).to.be.equal(T_R);
  });

  //Try to liquidate channel sending only the microcoin hash, without sending the proof hash
  it("Liquidate without proof ", async function (){
    //Consider that k = 1: 
    const k = 1; 
    let c = await channel1.connect(user1).c();

    //Calculate W_km
    let W_km = W(W_LM, c, k);

    //Calculate W_kc
    let W_kc = W(W_LC, c, k);

    //Execute liquidation
    expect(await channel1.connect(user2).c()).to.be.equal(2);
    const transfer = await channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, '0x0000000000000000000000000000000000000000');
    expect(await channel1.connect(user2).c()).to.be.equal(2);
  })

  it("Channel liquidation", async function () {
    //Consider that k = 2: 
    const k = 2; 
    let c = await channel1.connect(user1).c();

    //Calculate W_km
    let W_km = W(W_LM, c, k);

    //Calculate W_kc
    let W_kc = W(W_LC, c, k);

    //Execute liquidation
    const transfer = await channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, '0x0000000000000000000000000000000000000000');

    //Try to execut a bad liquidation with a bad k (repeating the same)
    await expect( channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, '0x0000000000000000000000000000000000000000')).to.be.reverted;

    //Try to execut a bad liquidation with a bad W_km
    //Generate a random W_LM element that will be sent to the liquidation method
    let W_LM_rand = Buffer.from(elliptic.rand(16)).toString("hex");
    W_LM_rand = W(W_LM_rand, c, 4);
    await expect( channel1.connect(user2).transferDeposit('0x'+W_LM_rand, '0x'+W_kc, 4, '0x0000000000000000000000000000000000000000')).to.be.reverted;

    //Try to execut a bad liquidation with a bad W_kc
    //Generate a random W_LC element that will be sent to the liquidation method
    let W_LC_rand = Buffer.from(elliptic.rand(16)).toString("hex");
    W_km = W(W_LM, c, 4);
    W_LC_rand = W(W_LM_rand, c, 4);
    await expect( channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_LC_rand, 4, '0x0000000000000000000000000000000000000000')).to.be.reverted;
  });

  
  
  it("Transfer channel", async function (){
    //Consider that now k = 4: 
    const k = 4; 
    let c = await channel1.connect(user1).c();

    //Calculate W_km
    let W_km = W(W_LM, c, k);

    //Calculate W_kc
    let W_kc = W(W_LC, c, k);

    //Deploy new channel to which the transfer will be made
    const _c = 1;
    const _v = ethers.utils.parseEther("0.002");

    await channelFactory.connect(user2)["createChannel(uint256,uint256)"](_c, _v);
    
    const user2Channels = await channelFactory.getOwnerChannels(user2.address);

    const channelSC = await ethers.getContractFactory('channel');
    channel2 = channelSC.attach(user2Channels[0]);

    expect(user2Channels[0]).to.not.be.undefined;
    expect(user2Channels[0]).to.be.equal(channel2.address);
    expect(await channel2.connect(user2).c()).to.not.be.undefined;

    //Try to execut a bad transference with a bad W_km
    //Generate a random W_LM element that will be sent to the liquidation method
    let W_LM_rand = Buffer.from(elliptic.rand(16)).toString("hex");
    W_LM_rand = W(W_LM_rand, c, k);
    await expect( channel1.connect(user2).transferDeposit('0x'+W_LM_rand, '0x'+W_kc, k, channel2.address)).to.be.reverted;

    //Try to execut a bad transference with a bad W_kc
    //Generate a random W_LC element that will be sent to the liquidation method
    let W_LC_rand = Buffer.from(elliptic.rand(16)).toString("hex");
    W_km = W(W_LM, c, k);
    W_LC_rand = W(W_LM_rand, c, k);
    await expect( channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_LC_rand, 4, channel2.address)).to.be.reverted;

    //Check channel1 and channel2 balance
    expect(await ethers.provider.getBalance(channel1.address)).to.not.be.equal(0);
    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(0);
    
    //User2 execute the transferDeposit function of the channel1 smart contract, sending the value to the channel2 smart contract.
    await channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, channel2.address);

    expect(await ethers.provider.getBalance(channel2.address)).to.not.be.equal(0);
    expect(await ethers.provider.getBalance(channel1.address)).to.be.equal(0);
  });

  it("Set channel2 params configuration", async function () {
    let c = await channel2.connect(user2).c();
    let v = await channel2.connect(user2).v();

    //Create W_LM, W_LC and respectives W_0M, W_0C
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM, c, 0);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC, c, 0);
    
    //Define T_exp = now + 10s
    T_exp = Date.now() + 10000;// Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000) // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + T_D
    T_D = 10;

    //Define T_R = 10s --> it would be T_exp + T_D + T_R
    T_R = 30;

    
    expect(await channel2.connect(user2).W_jm()).to.be.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(await channel2.connect(user2).W_jc()).to.be.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(await channel2.connect(user2).S_id()).to.be.equal('');
    expect(await channel2.connect(user2).T_exp()).to.be.equal(0);
    expect(await channel2.connect(user2).TD()).to.be.equal(0);
    expect(await channel2.connect(user2).TR()).to.be.equal(0);

    //User2 configure the channel2 params, executing setChannelParams()
    await channel2.connect(user2).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);

    expect(await channel2.connect(user2).W_jm()).to.be.equal('0x'+W_0M);
    expect(await channel2.connect(user2).W_jc()).to.be.equal('0x'+W_0C);
    expect(await channel2.connect(user2).S_id()).to.be.equal('Access to a newspaper for one day');
    expect(await channel2.connect(user2).T_exp()).to.be.equal(T_exp);
    expect(await channel2.connect(user2).TD()).to.be.equal(T_D);
    expect(await channel2.connect(user2).TR()).to.be.equal(T_R);
  }); 

  it("Refund channel2", async function(){
    //Spend time (35s), to reach the refund time.
    sleep(35000);

    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(2000000000000000);

    await channel2.connect(user2).channelClose();
    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(0);
  });

  it("Open channel3 ", async function(){
    //Define the c and v parameters of the channel3
    const _c = 2;
    const _v = ethers.utils.parseEther("0.002");
    const value = (_c*_v).toString();

    //Create a new channel owned by user1
    await channelFactory.connect(user1)["createChannel(uint256,uint256)"](_c, _v, { value: value});

    const user1Channels = await channelFactory.getOwnerChannels(user1.address);
    const channelAddress = await channelFactory.getChannels(2);

    expect(user1Channels[1]).to.not.be.undefined;
    expect(user1Channels[1]).to.be.equal(channelAddress);

    const channelSC = await ethers.getContractFactory('channel');
    channel3 = channelSC.attach(user1Channels[1]);

    //Review user1 Channel3 customer: 
    expect(await channel3.connect(user1).customer()).to.be.equal(user1.address);

    //Review user1Channel parameters (c & v)
    expect(await channel3.connect(user1).c()).to.be.equal(_c);
    expect(await channel3.connect(user1).v()).to.be.equal(_v);

    //Review user1Channel balance
    expect(await ethers.provider.getBalance(channel3.address)).to.be.equal((_c*_v).toString());

    const c = await channel3.connect(user1).c();
    const v = await channel3.connect(user1).v(); 

    //Create W_LM, W_LC and respectives W_0M, W_0C
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM, c, 0);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC, c, 0);
    
    //Define T_exp = now + 15s
    T_exp = Date.now() + 15000; // Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000) // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + T_D
    T_D = 10;

    //Define T_R = 30s --> it would be T_exp + T_D + T_R
    T_R = 30;

    //Execute setChannelParams() of the channel3 created
    await channel3.connect(user1).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);
  });

  it("Reuse channel 3", async function() {
    //Spend time (30s), because we only can do the channel transfer when the channel state is at refund time.
    sleep(30000); 
    
    //Obtain c and v of channel3 smart contract
    const c = await channel3.connect(user1).c();
    const v = await channel3.connect(user1).v(); 

    //Create W_LM, W_LC and respectives W_0M, W_0C
    const W_LM_3 = Buffer.from(elliptic.rand(16)).toString("hex");
    const W_0M_3 = W(W_LM_3, c, 0);

    const W_LC_3 = Buffer.from(elliptic.rand(16)).toString("hex");
    const W_0C_3 = W(W_LC_3, c, 0);
    
    //Define T_exp = now + 15s
    T_exp = Date.now() + 15000; // Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000); // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + T_D
    T_D = 10;

    //Define T_R = 10s --> it would be T_exp + T_D + T_R
    T_R = 30;

    //user1 reset the channel3 params to reuse this same channel. 
    await channel3.connect(user1).setChannelParams('0x'+W_0M_3, '0x'+W_0C_3, 'Access to a newspaper for two days', c, v, T_exp, T_D, T_R);
    expect(await ethers.provider.getBalance(channel3.address)).to.be.equal((c*v).toString());
    expect(await channel3.connect(user1).W_jm()).to.not.be.equal('0x'+W_0M);
    expect(await channel3.connect(user1).W_jm()).to.be.equal('0x'+W_0M_3);
  })
  
  it("CreateChannel and cofigure channel parameters in a single transaction", async function(){
    //CHANNEL PARAMETERS DEFINITION
    const _c = 2;
    const _v = ethers.utils.parseEther("0.002");
    const value = (_c*_v).toString();

    //Create W_LM, W_LC and respectives W_0M, W_0C
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM, _c, 0);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC, _c, 0);
    
    //Define T_exp = now + 15s
    T_exp = Date.now() + 15000; // Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000) // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + TD
    T_D = 10;

    //Define T_R = 30s --> it would be T_exp + TD + TR
    T_R = 30;

    //Create a new channel owned by user1, deployed from the channel smart contract using a single transaction to do the open and the parameters
    //configuration
    await channelFactory.connect(user1)["createChannel(uint256,uint256,bytes32,bytes32,string,uint256,uint256,uint256)"](_c, _v, '0x' + W_0M, '0x' + W_0C, 'Access to a newspaper for one day', T_exp, T_D, T_R, { value: value});

    const user1Channels = await channelFactory.getOwnerChannels(user1.address);
    const channelAddress = await channelFactory.getChannels(3);
    
    expect(user1Channels[2]).to.not.be.undefined;
    expect(user1Channels[2]).to.be.equal(channelAddress);

    //Review user1Channel customer: 
    const channelSC = await ethers.getContractFactory('channel');
    channel1 = channelSC.attach(user1Channels[2]);

    expect(await channel1.connect(user1).customer()).to.be.equal(user1.address);

    //Review user1Channel parameters (c & v)
    expect(await channel1.connect(user1).c()).to.be.equal(_c);
    expect(await channel1.connect(user1).v()).to.be.equal(_v);

    //Review user1Channel balance
    expect(await ethers.provider.getBalance(channel1.address)).to.be.equal((_c*_v).toString());
  })
})