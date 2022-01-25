const { expect } = require("chai");
const { ethers } = require("hardhat");

const sha256 = require('js-sha256');

const elliptic = require('elliptic');
const ecies = require('ecies-geth');

describe("Channel contract", function (){

  let channel, channel1;
  let W_LM, W_0M, W_LC, W_0C; 
  let T_exp, T_D, T_R;

  it("Address assignment", async function(){
    [user1, user2, user3] = await ethers.getSigners();
  })

  it("Deploys channelFactory smart contract", async function () {
    //Deploy the channelFactory smart contract
    channel = await ethers.getContractFactory('factoryChannel');
    channel = await channel.deploy(); 
    await channel.deployed();

    expect(channel.address).to.not.be.undefined; 
  })

  it("New channel deployment", async function () {
    const _c = 2;
    const _v = 1;
    
    //Create a new channel owned by user1
    await channel.connect(user1).createChannel(_c, _v, { value: _c*_v});

    const user1Channels = await channel.getOwnerChannels(user1.address);
    const channelAddress = await channel.getChannels(0);
    
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
    expect(await ethers.provider.getBalance(channel1.address)).to.be.equal(_c*_v);
  });

  it("Set channel params configuration", async function () {
    let c = await channel1.connect(user1).c();
    let v = await channel1.connect(user1).v();

    function W (W_X){

      var W= Buffer.from(W_X,'hex'); 

      let L = 2 * (c) + 1;
        for (L; L != 0; L--) {
            W = sha256(W);
            W = Buffer.from(W, 'hex');
        }
      W = Buffer.from(W).toString("hex");
      return W;
    };

    //Create W_LM, W_LC and respectives W_0M, W_0C
    W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0M = W(W_LM);

    W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
    W_0C = W(W_LC);
    
    //Define T_exp = now + 5 min
    T_exp = Date.now() + 300;
    
    //Define T_D = T_exp + 5min
    T_D = T_exp + 300;

    //Define T_R = T_exp + T_D + 5 min
    T_R = T_exp + T_D + 300;

    //Execute setChannelParams()
    await channel1.connect(user1).setChannelParams('0x'+W_0M, '0x'+W_0C, 'Access to a newspaper for one day', c, v, T_exp, T_D, T_R);
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


})
