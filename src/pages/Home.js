import React, { Component } from 'react';
import { Icon, Button, Dimmer, Loader, Segment, Table, Form, Input, Message, TableRow, TableCell, TableHeader, Label } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import factory from '../ethereum/factory';
import channel from '../ethereum/channel';
import variables from '../ethereum/variables';
import Swal from 'sweetalert2';
import web3 from '../ethereum/web3';
import DeliveryRow from '../components/DeliveryRow';
import db from '../db.json';

var sha256 = require('js-sha256');

const EC = require('elliptic').ec;
const elliptic = require('elliptic');

const ecies = require('ecies-geth');

class Home extends Component {
    state = {
        channel: '',
        channelID:'',
        channels: '',
        k: '',
        user_db: '',
        newChnAddr: '',
        ind: '',
        W_kM: '',
        W_kC: '',
        channelContract: '',
        j: '',
        W_iC_enc:'',
        loadingPage: true,
        loading: false,
        errorMessage: '',
        accounts: ''
    };

    componentDidMount = async () => {
        try {
            let T_EXP =[];
            let T_D = [];
            let T_R = [];

            const accounts = await web3.eth.getAccounts();
            const channelsCount = await factory.methods.getChannelsCount().call();
            
            const openChannels = await Promise.all(
                Array(parseInt(channelsCount)).fill().map((delivery, index) => {
                    return factory.methods.getChannels(index).call();
                })
            );

            fetch('http://localhost:7000/' + accounts[0], {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(res => {
                    return res.json();
                }).then(data => {
                    this.setState({
                        user_db: data,
                        accounts: accounts
                    })
                })

            await fetch('http://localhost:7000/channels', {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(res => {
                    return res.json();
                }).then(data => {
                    this.setState({
                        channels: data
                    })
                })

            this.setState({
                openChannels: openChannels,
                accounts: accounts
            })

            
        return Object.keys(this.state.channels).map((requests, index) => {
            let ret;
            if(this.state.channels[index]['customer'] === this.state.accounts[0]){
                if(parseInt(this.state.channels[index]['T_EXP'],10) != NaN && parseInt(this.state.channels[index]['Δ_TD'],10) != NaN && 
                parseInt(this.state.channels[index]['Δ_TR'],10)*1000 != NaN && (Date.now() > ((parseInt(this.state.channels[index]['T_EXP'],10)
                 + parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000)) 
                 && this.state.channels[index]['State'] != 'closed'){

                    //Popup indicating the automatic refund transaction
                    Swal.fire({
                        title: 'The channel time periods have expired, so a refund of the remaining microcoins will be made.',
                        icon: 'warning',
                        showCloseButton: true,
                        confirmButtonText: 'Accept',
                        width: 600,
                        padding: '3em',
                        backdrop: `
                          left top
                          no-repeat
                        `
                      }).then((result) => {
                        if (result.isConfirmed) {
                            //Automatic refund
                            this.setState({ index_refund: index+1});
                            this.refund();
                        }
                      })

                    

                }
            }
        });

        } finally {
            this.setState({ loadingPage: false })
        }
    }

    prepare_W = async event => {
        let channel_info;
        let W_kC, W_kM;
        let L;

        function W_nX (i, j, W_X){

            var W= Buffer.from(W_X,'hex'); 

            for(i; i!= j; i--){
              W = sha256(W);

              W = Buffer.from(W,'hex');
            }
            W = Buffer.from(W).toString("hex");
            return W;
          };


        this.state.user_db.map((chns, index)=>{
            if(this.state.user_db[index]['channelID'] === parseInt(this.state.channelID)){
                channel_info = this.state.user_db[index]
            }
        });

        let ind; 

        this.state.channels.map((chn, index) => {
            if(this.state.channels[index]['id'] === parseInt(this.state.channelID,10)){
                ind = index;
            }
        })

        if(parseInt(this.state.k, 10) === (channel_info['j']-1)){
            W_kC = this.state.channels[ind]['messages']['m1'];
        }else{
            W_kC = W_nX(channel_info['j'], this.state.k, channel_info.W_ic)
        }

        L = 2*(this.state.channels[ind]['c'])+1;

        //Determine the number of microcoins between the last microcoin liquideted and the last 
        //microcoin that the user wants to liquidate/transfer now (k-j).
        let channelContract = channel(this.state.channels[ind]['ethAddress']);
        let j = await channelContract.methods.j().call();
        
        console.log('this.state.k', this.state.k, 'j', j);
        let microcoinNumber = this.state.k - j;

        W_kM = W_nX(L, microcoinNumber, channel_info['W_LM']);

        this.setState({
            ind: ind,
            W_kM: W_kM,
            W_kC: W_kC,
        })

    }

    //Function to transfer part of the microcoins that are stored at the channel smart contract to the customer wallet.
    liquidation = async event => {
        event.preventDefault();
        this.setState({ loading: true, errorMessage: '' });

        try {
            await this.prepare_W();

            let channelContract = channel(this.state.channels[this.state.ind]['ethAddress']);

            let j = await channelContract.methods.j().call();

            await channelContract.methods.transferDeposit("0x" + this.state.W_kM, "0x" + this.state.W_kC, this.state.k, "0x0000000000000000000000000000000000000000")
            .send({ from: this.state.accounts[0] });
            
            let c, id;

            if(this.state.k % 2 == 0){
                c = ((this.state.k - parseInt(j,10))/2);
            }else{
                c = ((this.state.k - (parseInt(j,10) - 1))/2);
            }

            //Update parameter c at the channel json-server data base:
            fetch('http://localhost:7000/channels/' + this.state.channels[this.state.ind]['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "c": (parseInt(this.state.channels[this.state.ind]['c'],10)-c),
                })
            })

            this.props.history.push('/');
        } catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }
    }

    transfer = async (event) => {
        event.preventDefault();
        this.setState({ loading: true, errorMessage: '' });

        try {
            await this.prepare_W();

            let channelContract = channel(this.state.channels[this.state.ind]['ethAddress'])

            let j = await channelContract.methods.j().call();


            await channelContract.methods.transferDeposit("0x" + this.state.W_kM, "0x" + this.state.W_kC, this.state.k, this.state.newChnAddr)
            .send({ from: this.state.accounts[0] });

            this.setState({
                j: j
            })

           //Update parameter c at the json-server data base:
            this.updateC();

        } catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }
    }

    updateC = async (event) => {
        //event.preventDefault();
        //this.setState({ loading: true, errorMessage: '' });

        try{
            let c, ind, id;

            if(this.state.k % 2 == 0){
                c = ((this.state.k - parseInt(this.state.j,10))/2);
            }else{
                c = ((this.state.k - (parseInt(this.state.j,10) - 1))/2);
            }

            this.state.channels.map((chn, index) => {
                if(this.state.channels[index]['ethAddress'] === this.state.newChnAddr){
                    id = this.state.channels[index]['id'];
                }
            });

            //Update parameter c at the channel json-server data base:
            fetch('http://localhost:7000/channels/' + this.state.channels[this.state.ind]['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "c": (parseInt(this.state.channels[this.state.ind]['c'],10)-c),
                })
            })


            //Update parameter c at the NEW channel json-server database:
            fetch('http://localhost:7000/channels/' + id, {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "c": c
                })
            })
            .then(res => {
                return res.json();
            })
            .then(data => {
            })


        }catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }
    }

    Accept = async (channel_ID) => {
        const data = this.state.user_db;

        let merchant_ch, channel;

        data.map((ch, index) => {
            if (channel_ID === data[index]['channelID']) {
                merchant_ch = data[index];
            }
        })
        
        const W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
        
        let W = Buffer.from(W_LM,'hex');
        
        this.state.channels.map((ch, index) => {
            
            if (channel_ID === this.state.channels[index]['id']) {
                channel = this.state.channels[index];
            }
        })

        let L = 2 * (channel.c) + 1;
        for (L; L != 0; L--) {
            W = sha256(W);
            W = Buffer.from(W, 'hex');
        }

        W = Buffer.from(W).toString("hex");

        const id = merchant_ch.channelID;

        //Creation of user private and public keys for this channel: 
        const privateKey = elliptic.rand(32);
        const publicKey = await ecies.getPublic(privateKey);

        
        fetch('http://localhost:7000/channels/' + merchant_ch.channelID, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "State": 'accepted',
                "W_0M": W,
                "M Public Key": Buffer.from(publicKey, 'hex').toString('hex')
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                
            })

        fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + merchant_ch['id'], {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "W_LM": W_LM,
                "j": 0,
                "Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                "Private Key": Buffer.from(privateKey, 'hex').toString('hex')
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
            })
    }

    purchaseService = async (data) => {
        this.setState({ loading: true, errorMessage: '' });

        try {
            let index_userChannel, i;

            function W_nX (n, W_X){
                var W= Buffer.from(W_X,'hex');

                var L = 2*(c)+1;
                for(L; L!= n; L--){
                  W = sha256(W);
                  W = Buffer.from(W,'hex');
                }
    
                W =  Buffer.from(W).toString("hex");
                return W;
            };

        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id'].toString()){
                index_userChannel = index;
            }
        })
          
        if(data['messages']){
            i = data['messages']['i']+1;
        }else{
            i = 1;
        }

        var c = data.c_init;
          
        const W_iC = W_nX(i, this.state.user_db[index_userChannel]['W_LC']).toString('hex');

        let M_PublicKey = this.state.channels[data['id']-1]['M Public Key']; 
        M_PublicKey = Buffer.from(M_PublicKey, 'hex');

        let W_iC_enc = await ecies.encrypt(M_PublicKey, Buffer.from(W_iC));
        W_iC_enc = Buffer.from(W_iC_enc, 'hex').toString('hex');

        await fetch('http://localhost:7000/channels/' + data['id'], {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "messages":{
                    "i": i,
                    "m1": W_iC_enc
                }, 
                "State": 'payment'
              })
            })
              .then(res => {
                return res.json();
              })
              .then(data => {
                console.log('fetch', data);
              });
        
              
          // Refresh, using withRouter
          this.props.history.push('/');

        } catch (err) {
          this.setState({ errorMessage: err.message });
        } finally {
          this.setState({ loading: false });
        };
      }

    //Send m2
    send = async (data) => {
        
        var index_userChannel;

        let address = data['ethAddress']
        
        let channelContract = channel(address);
        
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id']){
                index_userChannel = index;
            }
        })

        function W_nX (i, j, W_X){
            var W= Buffer.from(W_X,'hex');
            
            for(i; i!= j; i--){
              W = sha256(W);
              W = Buffer.from(W,'hex');
            }

            W = Buffer.from(W).toString("hex");
            return W;
        };

        var c = data['c'];

        let M_Private_Key = this.state.user_db[index_userChannel]['Private Key'];
        M_Private_Key = Buffer.from(M_Private_Key, 'hex');

        let M1_dec = await ecies.decrypt(M_Private_Key, Buffer.from(data['messages']['m1'], 'hex'));
        M1_dec = M1_dec.toString();
        

        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], M1_dec);
        
        var W_ic;

        //Not the first payement
        if(this.state.user_db[index_userChannel]['W_ic']){
            W_ic = this.state.user_db[index_userChannel]['W_ic'];
        }
        //Is the first payement:
        else{
            W_ic = data['W_0C'];
        }

        if((data['messages']['i'] > this.state.user_db[index_userChannel]['j']) && (hash === W_ic)){

            
            let C_PublicKey = data['C Public Key']; 
            C_PublicKey = Buffer.from(C_PublicKey, 'hex');

            let m2_enc = await ecies.encrypt(C_PublicKey, Buffer.from(data['service']));
            m2_enc = Buffer.from(m2_enc, 'hex').toString('hex');

            fetch('http://localhost:7000/channels/' + data['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    "State": 'send service',
                    "messages":{
                        "i": data['messages']['i'],
                        "m1": data['messages']['m1'],
                        "m2": m2_enc
                    }
                })
            }).then(res => {
                    return res.json();
                }).then(data => {
                    this.setState({
                        channels: data
                    })
                })
    

            fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + (index_userChannel+1), {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "W_ic": M1_dec,
                    "j": data['messages']['i']
                })
            }).then(res => {
                    return res.json();
                }).then(data => {
                    this.setState({
                        channels: data
                    })
                })
        
        }else{
            alert('The micro coin is not valid!')
        }

    }

    sendProof = async (data) =>{
        
        var index_userChannel;
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id'].toString()){
                index_userChannel = index;
            }
        })

        function W_nX (n, W_X){
            
            var W = Buffer.from(W_X,'hex');
            
            var L = 2*(c)+1;
            for(L; L!= n; L--){
              W = sha256(W);
              W = Buffer.from(W,'hex');
            }
            W =  Buffer.from(W).toString("hex");
           
            return W;
        };

        //Decrypt m2
        let C_Private_Key = this.state.user_db[index_userChannel]['Private Key'];
        C_Private_Key = Buffer.from(C_Private_Key, 'hex');

        let M2_dec = await ecies.decrypt(C_Private_Key, Buffer.from(data['messages']['m2'], 'hex'));
        M2_dec = M2_dec.toString();

        var c = data['c_init'];

        var hash = W_nX(parseInt(data['messages']['i'],10)+1, this.state.user_db[index_userChannel]['W_LC']);
        
        //Encrypt m3
            let M_PublicKey = data['M Public Key']; 
            M_PublicKey = Buffer.from(M_PublicKey, 'hex');

            let m3_enc = await ecies.encrypt(M_PublicKey, Buffer.from(hash));
            m3_enc = Buffer.from(m3_enc, 'hex').toString('hex');

        fetch('http://localhost:7000/channels/' + data['id'], {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "State": 'send proof',
                "messages":{
                    "i": (parseInt(data['messages']['i'])+1),
                    "m1": data['messages']['m1'],
                    "m2": data['messages']['m2'],
                    "m3": m3_enc
                }
            })
        }).then(res => {
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            })
    }

    //m3 verification by M
    verify = async (data) =>{
        //TODO: DECRYPT m3
        var index_userChannel;
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id']){
                index_userChannel = index;
            }
        });

        function W_nX (i, j, W_X){
            var W= Buffer.from(W_X,'hex');

            for(i; i!= j; i--){
                W = sha256(W);
                W = Buffer.from(W,'hex');
            }
            W = Buffer.from(W).toString("hex");

            return W;
        };

        //Decrypt m3
        let M_Private_Key = this.state.user_db[index_userChannel]['Private Key'];
        M_Private_Key = Buffer.from(M_Private_Key, 'hex');

        let M3_dec = await ecies.decrypt(M_Private_Key, Buffer.from(data['messages']['m3'], 'hex'));
        M3_dec = M3_dec.toString();

        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], M3_dec)

        if(hash === this.state.user_db[index_userChannel]['W_ic']){
           
            fetch('http://localhost:7000/channels/' + data['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "State": 'opened',
                })
            }).then(res => {
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            })

            //Update j and W_ic
            fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + (index_userChannel+1), {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "j": data['messages']['i'],
                    "W_ic": M3_dec
                })
            }).then(res => {
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            })

        }else{ 
            alert ('Error!')
        }
    }

    //Channel refund (Customer)
    refund = async () =>  {
        try{ 
            
            this.setState({ loading: true, errorMessage: '' });
            
            let chn = this.state.channels
            let ind = this.state.index_refund;
            let address = chn[ind-1]['ethAddress']
            let channelContract = channel(address);

            if(this.state.accounts[0] === chn[ind-1]['customer']){
                await channelContract.methods.channelClose().send({ from: this.state.accounts[0] });
                
                fetch('http://localhost:7000/channels/' + chn[ind-1]['id'], {
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        'c': 0,
                        "State": 'closed'
                    })
                }).then(res => {
                        return res.json();
                    }).then(data => {
                        this.setState({
                            channels: data
                        })
                    });
            }
        }catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }
    }

    renderChannels() {

        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            let ret;

            if((data[index]['customer'] === this.state.accounts[0] || data[index]['merchant'] === this.state.accounts[0])){

                if(data[index]['State'] === 'closed'){
                    ret = <div><Label as='a' color='green' horizontal>Channel closed</Label></div>
                }else if(parseInt(this.state.channels[index]['T_EXP'],10)*1000 < Date.now() && Date.now() < 
                (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000){
                    ret = <div><Label as='a' color='blue' horizontal>Liquidation time</Label></div>
                }else if((parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000 < Date.now() 
                && Date.now() < (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10) 
                + parseInt(this.state.channels[index]['Δ_TR'],10))*1000){
                    ret = <div><Label as='a' color='green' horizontal>Refund time</Label></div>
                }else if(parseInt(this.state.channels[index]['T_EXP'],10) != NaN && parseInt(this.state.channels[index]['Δ_TD'],10) != NaN && 
                parseInt(this.state.channels[index]['Δ_TR'],10)*1000 != NaN && (Date.now() > ((parseInt(this.state.channels[index]['T_EXP'],10)
                 + parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000))){
                    ret = <div><Label as='a' color='green' horizontal>Channel closed - Period ended</Label></div>
                }
            
            if((this.state.accounts[0] === data[index]['merchant'] || data[index]['customer'] === this.state.accounts[0]) && ret === undefined ){

                if(data[index]['customer'] === this.state.accounts[0]){
                    if(data[index]['State'] === 'requested'){
                        ret = <div><Label as='a' color='yellow' horizontal>Waiting Acceptance</Label></div>
                    }else if(data[index]['State'] === 'accepted'){
                        ret =   <div><Link to={"/channels/open/" + data[index]['id']}>
                                    <Button animated='vertical' color='blue'>
                                        <Button.Content hidden>Open</Button.Content>
                                        <Button.Content visible>
                                            <Icon name='exchange' />
                                        </Button.Content>
                                    </Button>
                                </Link></div>
                    }else if(data[index]['State'] === 'opened- waiting configuration'){
                        ret =   <div><Link to={"/channels/open/" + data[index]['id']}>
                                    <Button color='blue'>
                                        <Button.Content hidden>Configure</Button.Content>
                                    </Button>
                                </Link></div>
                    }else if(data[index]['State'] === 'opened' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        if(data[index]['messages'] != undefined && data[index]['messages']['i'] === 2*data[index]['c_init']){
                            //if(data[index]['messages']['i'] === 2*data[index]['c_init']){
                                ret = <div><Label as='a' color='green' horizontal>Deposit ended</Label></div>
                            //}
                        }else{

                        //Customer purchase service
                        ret =   <div>
                                    <Button animated='vertical' color='blue' onClick={() => this.purchaseService(data[index])}>
                                        <Button.Content hidden>Purchase</Button.Content>
                                        <Button.Content visible>
                                            <Icon name='exchange' />
                                        </Button.Content>
                                    </Button>
                                </div>
                        }
                    }else if(data[index]['State'] === 'payment' && Date.now() > parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret =   <div><Label as='a' color='red' horizontal>Purchase time expired</Label></div>
                    }else if(data[index]['State'] === 'opened' && (Date.now > parseInt(this.state.channels[index]['T_EXP'],10) + 
                    parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000){
                        ret =   <div><Label as='a' color='red' horizontal>Purchase time expired</Label></div>
                    }else if(data[index]['State'] === 'payment' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        //Merchant send service (m2)
                        ret =   <div><Label as='a' color='yellow' horizontal>Waiting service</Label></div>
                    }else if(data[index]['State'] === 'send service' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret =   <div><Button animated='vertical' color='yellow' onClick={() => this.sendProof(data[index])}>
                                    <Button.Content hidden>Proof</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='exchange' />
                                    </Button.Content>
                                </Button></div>
                    }else if(data[index]['State'] === 'send proof' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret = <div><Label as='a' color='orange' horizontal>Waiting M verification</Label></div>
                    }
                }else if(data[index]['merchant'] === this.state.accounts[0]){
                    if(data[index]['State'] === 'requested'){
                        ret = <div><Label as='a' color='yellow' horizontal>Waiting for Acceptance</Label></div>
                    }else if(data[index]['State'] === 'accepted'){
                        ret = <div><Label as='a' color='yellow' horizontal>Waiting for Opening</Label></div>
                    }else if(data[index]['State'] === 'payment' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        //Merchant send service (m2)
                        ret =   <div><Button animated='vertical' color='blue' onClick={() => this.send(data[index])}>
                                    <Button.Content hidden>Send</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='exchange' />
                                    </Button.Content>
                                </Button></div>
                    }else if(data[index]['State'] === 'payment' && Date.now() > parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret =   <div><Label as='a' color='red' horizontal>Purchase time expired</Label></div>
                    }else if(data[index]['State'] === 'opened- waiting configuration'){
                        ret =   <div><Label as='a' color='yellow' horizontal>Waiting channel configuration</Label></div>
                    }/*else if(data[index]['State'] === 'opened' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000 && data[index]['messages']['i'] === 2*data[index]['c_init']){
                        ret = <div><Label as='a' color='green' horizontal>Deposit ended</Label></div>
                    }*/else if(data[index]['State'] === 'opened' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret = <div><Label as='a' color='green' horizontal>Opened</Label></div>
                    }else if(data[index]['State'] === 'opened' && Date.now() > (parseInt(this.state.channels[index]['T_EXP'],10) + 
                    parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000){
                        ret =   <div><Label as='a' color='red' horizontal>Purchase time expired</Label></div>
                    }else if(data[index]['State'] === 'send service' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret = <div><Label as='a' color='blue' horizontal>Waiting proof</Label></div>
                    }else if(data[index]['State'] === 'send proof' && Date.now() < parseInt(this.state.channels[index]['T_EXP'],10)*1000){
                        ret =   <div><Button animated='vertical' color='yellow' onClick={() => this.verify(data[index])}>
                                    <Button.Content hidden>Verify</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='check' />
                                    </Button.Content>
                                </Button></div>
                    }
                }
            }
            
                return (
                    <Table.Row>
                        <Table.Cell>
                            {index+1}
                        </Table.Cell>
                        <Table.Cell>
                            {data[index]['merchant']}
                        </Table.Cell>
                        <Table.Cell>
                            {data[index]['customer']}
                        </Table.Cell>
                        <Table.Cell>
                            <Link to={"/channels/" + data[index]['id']}>
                                <Button animated='vertical' color='blue'>
                                    <Button.Content hidden>View</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='eye' />
                                    </Button.Content>
                                </Button>
                            </Link>
                        </Table.Cell>
                        <Table.Cell>
                            {ret}
                        </Table.Cell>
                    </Table.Row>
                )
            }
        })


    };

    renderRequests() {
        const channels = this.state.channels;
        return Object.keys(channels).map((channel, index) => {
            if (channels[index]['State'] === 'requested' && channels[index]['merchant'] === this.state.accounts[0]) {
                return (
                    <Table.Row>
                        <Table.Cell>
                            {index+1}
                        </Table.Cell>
                        <Table.Cell>
                            {channels[index]['customer']}
                        </Table.Cell>
                        <Table.Cell>
                            {channels[index]['service']}
                        </Table.Cell>
                        <Table.Cell>
                            {channels[index]['c']}
                        </Table.Cell>
                        <Table.Cell>
                            <Button animated='vertical' color='blue' onClick={() => this.Accept(channels[index]['id'])}>
                                <Button.Content hidden>Accept</Button.Content>
                                <Button.Content visible>
                                    <Icon name='send' />
                                </Button.Content>
                            </Button>
                        </Table.Cell>
                    </Table.Row>
                )
            }
        })
    }

    renderOwnedChannelsLiquidation(){
        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {

            if (data[index]['merchant'] === this.state.accounts[0] && 
            Date.now() < (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000)  {
                return(
                    <option>{data[index]['id']}</option>
                )
            }
        })
    }

    rendermicroCoins (channelID) {
        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            let coins = [];

            if (data[index]['id'] === parseInt(channelID,10)) {
                
                let j;
                Object.keys(this.state.user_db).map((chn, index)=>{

                    if(this.state.user_db[index]['channelID'] === parseInt(channelID,10)){
                        j = this.state.user_db[index]['j'];
                        
                        for(j; j!= 0; j--){
                            coins.push(j)
                        }
                    }
                })
            }

            return coins.map((coin, index)=>{
                return(
                    <option>{coins[index]}</option>
                )
            });
        })
    }

    renderOwnedChannelsRefund() {
        const data = this.state.channels;
        
        return Object.keys(data).map((requests, index) => {
            if (data[index]['customer'] === this.state.accounts[0] 
            && (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000 < Date.now() && 
            Date.now() < (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000){   
                return(
                    <option>{data[index]['id']}</option>
                )
            }
        })
    }

    render() {
        // Loading
        if (this.state.loadingPage) return (
            <div>
                <Segment style={{ height: '80vh' }}>
                    <Dimmer active inverted>
                        <Loader inverted content='Loading...' />
                    </Dimmer>
                </Segment>
            </div>
        );

        // Done
        return (
            <div>
                {(db.services[this.state.accounts[0]]) ? (
                    <div>
                        <h3>Search channel</h3>
                    </div>
                ) :
                    (<div>
                        <h3>Channels</h3>
                        <Table fixed>
                            <Table.Header>
                                <Table.Row>
                                    <Table.HeaderCell style={{ width: "5%" }}>#</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "50%" }}>Merchant</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "50%" }}>Customer</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "20%" }}></Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "20%" }}></Table.HeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>{this.renderChannels()}</Table.Body>
                        </Table>
                        <h3><Icon name='sign in alternate' circular />&nbsp;Requests</h3>
                        <Table fixed>
                            <Table.Header>
                                <Table.Row>
                                    <Table.HeaderCell style={{ width: "10%" }}>#</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "30%" }}>Customer</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "40%" }}>Service</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "10%" }}>µ-coins</Table.HeaderCell>
                                    <Table.HeaderCell style={{ width: "10%" }}></Table.HeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>{this.renderRequests()}</Table.Body>
                        </Table>

                        <h3>Channel liquidation</h3>
                        <Form onSubmit={this.liquidation} error={!!this.state.errorMessage}>

                            <Form.Field>
                                <label>Channel ID:</label>
                                <select value={this.state.channelID} onChange={event =>  {
                                    this.setState({ channelID: event.target.value});
                                }
                                }>
                                <option></option>
                                    {this.renderOwnedChannelsLiquidation()}
                                </select>
                            </Form.Field>

                            <Form.Field>
                                <label>k:</label>
                                <select value={this.state.k} onChange={event => {
                                    this.setState({
                                        k: event.target.value
                                    })
                                }}>
                                <option></option>
                                    {this.rendermicroCoins(this.state.channelID)}
                                </select>
                            </Form.Field>
                            <Message error header="ERROR" content={this.state.errorMessage} />
                            <Button primary loading={this.state.loading}>
                                Send!
                            </Button>
                        </Form>

                        <h3>Channel transference</h3>
                        <Form onSubmit={this.transfer} error={!!this.state.errorMessage}>

                            <Form.Field>
                                <label>Channel ID:</label>
                                <select value={this.state.channelID} onChange={event =>  {
                                    this.setState({ channelID: event.target.value});
                                }
                                }>
                                <option></option>
                                    {this.renderOwnedChannelsLiquidation()}
                                </select>
                            </Form.Field>

                            <Form.Field>
                                <label>k:</label>
                                <select value={this.state.k} onChange={event => {
                                    this.setState({
                                        k: event.target.value
                                    })
                                }}>
                                <option></option>
                                    {this.rendermicroCoins(this.state.channelID)}
                                </select>
                            </Form.Field>

                            <Form.Field>
                            <label>New channel Ethereum Address:</label>
                            <Input
                                value={this.state.newChnAddr}
                                onChange={event => this.setState({ newChnAddr: event.target.value })}
                            />
                            </Form.Field>
                            <Message error header="ERROR" content={this.state.errorMessage} />
                            <Button primary loading={this.state.loading}>
                                Send!
                            </Button>
                        </Form>

                        <h3>Channel refund</h3>
                        <Form onSubmit={this.refund} error={!!this.state.errorMessage}>

                            <Form.Field>
                                <label>Channel ID:</label>
                                <select value={this.state.index_refund} onChange={event =>  {
                                    this.setState({ index_refund: event.target.value});
                                }
                                }>
                                <option></option>
                                    {this.renderOwnedChannelsRefund()}
                                </select>
                            </Form.Field>
                            <Message error header="ERROR" content={this.state.errorMessage} />
                            <Button primary loading={this.state.loading} style={{"margin-bottom":20}}>
                                Refund!
                            </Button>
                        </Form>

                    </div>)
                }
                
            </div>
        );
    }
}

export default Home;
