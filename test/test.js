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

  //Fuction that calculates the hash chains, as parameters we have the hash (sha256), the 'c' value and finally the 'k'.
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
    console.log(Date.now());
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
    const ch = await channelFactory.connect(user1).createChannel(_c, _v, { value: value});
    console.log('gasPrice createChannel',await ch.gasPrice)

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
    const setChParams = await channel1.connect(user1).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);
    console.log('gasPrice setChParams',await setChParams.gasPrice)
    
  })


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

  it("Channel liquidation", async function () {
    //Consider that k = 2: 
    const k = 2; 
    let c = await channel1.connect(user1).c();

    //Calculate W_km
    let W_km = W(W_LM, c, k);

    //Calculate W_kc
    let W_kc = W(W_LC, c, k);

    //const balance1 = await ethers.provider.getBalance(user2.address);
    //console.log(balance1);

    //Execute liquidation
    const liquidation = await channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, '0x0000000000000000000000000000000000000000');
    console.log('gasPrice liquidation',await liquidation.gasPrice)
    
    //console.log('transaction receipt',await ethers.provider.getTransactionReceipt(liquidation.hash))
    //console.log('liquidation ', await ethers.provider.getTransactionReceipt(liquidation.hash).gasUsed)
    //console.log('gasPrice ',await liquidation.gasPrice)
    //console.log(await ethers.provider.getBalance(user2.address))
    //console.log(balance1 - await ethers.provider.getBalance(user2.address));
    //console.log(await ethers.provider.getBalance(channel1.address));
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

    const ch = await channelFactory.connect(user2).createChannel(_c, _v);
    console.log('gasPrice createChannel',await ch.gasPrice)
    
    const user2Channels = await channelFactory.getOwnerChannels(user2.address);

    const channelSC = await ethers.getContractFactory('channel');
    channel2 = channelSC.attach(user2Channels[0]);

    expect(user2Channels[0]).to.not.be.undefined;
    expect(user2Channels[0]).to.be.equal(channel2.address);
    expect(await channel2.connect(user2).c()).to.not.be.undefined;

    //console.log('gasPrice',ethers.utils.formatEther(await ch.gasPrice));
    //console.log(await ethers.provider.getBalance(channel2.address));
    //console.log('user2 balance', await ethers.provider.getBalance(user2.address));

    //console.log('T_exp', T_exp, await channel1.connect(user1).T_exp());
    //console.log('T_exp + T_D ', T_exp + T_D);
    //console.log('T_exp + T_D + T_R ', T_exp + T_D + T_R);

    //Spend time (30s), because we only can do the channel transfer when the channel state is at refund time.
    //sleep(30000);

    expect(await ethers.provider.getBalance(channel1.address)).to.not.be.equal(0);
    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(0);
    
    const balance1 = await ethers.provider.getBalance(user2.address)
    console.log('Transfer deposit transaction: ');
    console.log('User2 balance', balance1)
    //User2 execute the transferDeposit function of the channel1 smart contract, sending the value to the channel2 smart contract.
    const transfer = await channel1.connect(user2).transferDeposit('0x'+W_km, '0x'+W_kc, k, channel2.address);
    const balance2 = await ethers.provider.getBalance(user2.address)
    console.log('User2 balance', balance2);
    console.log('Balance difference', balance1 - balance2);
    console.log('gasUsed ', (await ethers.provider.getTransactionReceipt(transfer.hash)).gasUsed)
    console.log('gasPrice ',await transfer.gasPrice)
    console.log('gasPrice*gasUsed: ', (await ethers.provider.getTransactionReceipt(transfer.hash)).gasUsed * (await transfer.gasPrice))


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

    //User2 configure the channel2 params, executing setChannelParams()
    const setChParams = await channel2.connect(user2).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);
    console.log('user2 balance', await ethers.provider.getBalance(user2.address));
    console.log('gasPrice setChParams',await setChParams.gasPrice)

  }); 

  it("Refund channel2", async function(){
    //Spend time (30s), to reach the refund time.
    sleep(30000);

    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(2000000000000000);

    const refund = await channel2.connect(user2).channelClose();
    console.log('gasPrice refund',await refund.gasPrice)
    expect(await ethers.provider.getBalance(channel2.address)).to.be.equal(0);
  });

  it("Open channel3 ", async function(){
    //Define the c and v parameters of the channel3
    const _c = 2;
    const _v = ethers.utils.parseEther("0.002");
    const value = (_c*_v).toString();

    //Create a new channel owned by user1
    await channelFactory.connect(user1).createChannel(_c, _v, { value: value});

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
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM, c, 0);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC, c, 0);
    
    //Define T_exp = now + 15s
    T_exp = Date.now() + 15000; // Date.now() represents the hour in milliseconds since 00:00:00 UTC of 1 of January of 1970. 
    T_exp = Math.trunc(T_exp / 1000); // Solidity timestamp units are in seconds.

    //Define T_D = 10s --> it would be T_exp + T_D
    T_D = 10;

    //Define T_R = 10s --> it would be T_exp + T_D + T_R
    T_R = 30;

    //user1 reset the channel3 params to reuse this same channel. 
    await channel3.connect(user1).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for two days', c, v, T_exp, T_D, T_R);
    expect(await ethers.provider.getBalance(channel3.address)).to.be.equal((c*v).toString());
  })
})
