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

            /*const channels = */await fetch('http://localhost:7000/channels', {
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

            //console.log('chn', this.state.channels);

            
        return Object.keys(this.state.channels).map((requests, index) => {
            let ret;
            //console.log('hola')
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
        
        W_kM = W_nX(L, this.state.k, channel_info['W_LM']);

        this.setState({
            ind: ind,
            W_kM: W_kM,
            W_kC: W_kC,
        })

    }

    //Funció per transferir part de les micro-monedes de deposit del canal a la wallet del comprador
    liquidation = async event => {
        event.preventDefault();
        this.setState({ loading: true, errorMessage: '' });

        try {
            await this.prepare_W();

            let channelContract = channel(this.state.channels[this.state.ind]['ethAddress']);

            let j = await channelContract.methods.j().call();
            /*let W_0m = await channelContract.methods.W_jm().call();
            let W_0c = await channelContract.methods.W_jc().call();*/

            await channelContract.methods.transferDeposit("0x" + this.state.W_kM, "0x" + this.state.W_kC, this.state.k, "0x0000000000000000000000000000000000000000")
            .send({ from: this.state.accounts[0] });
            
            let c, id;

            if(this.state.k % 2 == 0){
                c = ((this.state.k - parseInt(j,10))/2);
            }else{
                c = ((this.state.k - (parseInt(j,10) - 1))/2);
            }

            /*let j_new = await channelContract.methods.j().call();
            /*this.state.channels.map( (chn, index) => {
                if(this.state.channels[index]['ethAddress'] === this.state.newChnAddr){
                    id = this.state.channels[index]['id'];
                }
            });*/

            //let State; //, index_userChannel; 
            /*this.state.user_db.map((info, index)=>{
                if(this.state.user_db[index]['channelID'] === this.state.channels[this.state.ind]['id']){
                    index_userChannel = index;
                }
            });*/

            /*console.log(this.state.channels[this.state.ind]['messages']['i'], j_new);

            if(this.state.channels[this.state.ind]['messages']['i'] === j_new && this.state.channels[this.state.ind]['T_EXP'] < Date.now()){
                State = "liquidated";
                console.log('liquidated')
            }else{
                State = "opened";
            }

            alert('');*/

            //Update parameter c at the channel json-server data base:
            fetch('http://localhost:7000/channels/' + this.state.channels[this.state.ind]['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "c": (parseInt(this.state.channels[this.state.ind]['c'],10)-c),
                    //"State": State
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
            let W_jm = await channelContract.methods.W_jm().call();
            let W_jc = await channelContract.methods.W_jc().call();

            console.log("0x" + this.state.W_kM, "0x" + this.state.W_kC, "k", this.state.k, "New chn" + this.state.newChnAddr);
            console.log('W_jm', W_jm, 'W_jc', W_jc);
            alert();

            await channelContract.methods.transferDeposit("0x" + this.state.W_kM, "0x" + this.state.W_kC, this.state.k, this.state.newChnAddr)
            .send({ from: this.state.accounts[0] });

            this.setState({
                j: j
            })

           //Update parameter c at the json-server data base:
            this.updateC();

            //this.props.history.push('/');
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


            //Uptade parameter c at the NEW channel json-server database:
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

    Accept(channel_ID) {
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
        
        fetch('http://localhost:7000/channels/' + merchant_ch.channelID, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "State": 'accepted',
                "W_0M": W
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
                "j": 0
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
            })

            //this.props.history.push('/');
    }

    purchaseService = async (data) => {
        this.setState({ loading: true, errorMessage: '' });

        try {
            let index_userChannel, i;

            function W_nX (n, W_X){
                var W= Buffer.from(W_X,'hex');//W_X
                
                var L = 2*(c)+1;
                for(L; L!= n; L--){
                  W = sha256(W);
                  W = Buffer.from(W,'hex');
                }
    
                W =  Buffer.from(W).toString("hex");
                return W;
            };
    
          /*const accounts = await web3.eth.getAccounts();
    
          let i;
    
          await fetch('http://localhost:7000/channels/' + this.state.propsID)
          .then(res => {
            return res.json();
          })
          .then(data => {
            console.log('fetch', data);
            this.setState({
              channelInfo: data
            })
          });*/

        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id'].toString()){
                index_userChannel = index;
            }
        })

        
          /*if(this.state.channelInfo['messages']){
            i = parseInt(this.state.microcoin,10) + this.state.channelInfo['messages']['i'];
          }else{
            i = this.state.microcoin;
          }
    
          await fetch('http://localhost:7000/'+ this.state.accounts[0])
          .then(res => {
            return res.json();
          })
          .then(data => {
            data.map((ch, index)=>{
                if(data[index]['channelID'] === this.state.propsID){
                    this.setState({
                        channel_C_Info: data[index]
                    })
                }
    
            })
          });*/
          
          if(data['messages']){
            i = data['messages']['i']+1;
          }else{
            i = 1;
          }

          var c = data.c_init;
          
          console.log('c', c, data, 'i', i, this.state.user_db[index_userChannel]['W_LC'], data['id'])

          const W_iC = W_nX(i, this.state.user_db[index_userChannel]['W_LC']).toString('hex');
    
          await fetch('http://localhost:7000/channels/' + data['id'], {
              method: 'PATCH',
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "messages":{
                    "i": i,
                    "m1": W_iC
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

        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], data['messages']['m1'])
        
          var W_ic;

        //Not the first payement
        if(this.state.user_db[index_userChannel]['W_ic']){
            W_ic = this.state.user_db[index_userChannel]['W_ic'];
        }
        //Is the first payement:
        else{
            W_ic = data['W_0C'];
        }
        
        console.log(data['messages']['i'], this.state.user_db[index_userChannel]['j'], hash, W_ic);
        if((data['messages']['i'] > this.state.user_db[index_userChannel]['j']) && (hash === W_ic)){
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
                        "m2": data['service']
                    }
                })
                })
                .then(res => {
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
                        "W_ic":data['messages']['m1'],
                        "j": data['messages']['i']
                    })
                    })
                    .then(res => {
                        return res.json();
                    }).then(data => {
                        this.setState({
                            channels: data
                        })
                    })
        
           
        }else{
            alert('The micro coin is not valid!')
        }
        //this.props.history.push('/');

    }

    sendProof(data){
        //TODO: DECRYPT M2
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

        var c = data['c'];

        var hash = W_nX(parseInt(data['messages']['i'],10)+1, this.state.user_db[index_userChannel]['W_LC'])

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
                        "m3": hash
                    }
                })
                })
                .then(res => {

                    return res.json();
                }).then(data => {
                    this.setState({
                        channels: data
                    })
                })
    
                //this.props.history.push('/');
    }

    //m3 verification by M
    verify(data){
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
            console.log(W)
            }
            W = Buffer.from(W).toString("hex");
            return W;
        };

        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], data['messages']['m3'])

        if(hash === this.state.user_db[index_userChannel]['W_ic']){
           
            fetch('http://localhost:7000/channels/' + data['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "State": 'opened',
                })
            })
            .then(res => {
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
                    "W_ic":data['messages']['m3']
                })
            })
            .then(res => {
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            })

        }else{ 
            alert ('Error!')
        }
        //this.props.history.push('/');
    }

    //Channel refund (Customer)
    refund = async () =>  {
        try{ 
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
                    })
                    .then(res => {
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
       //this.props.history.push('/');
    }

    renderChannels() {

        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            let ret;

            if((data[index]['customer'] === this.state.accounts[0] || data[index]['merchant'] === this.state.accounts[0])){
                
                console.log('now', Date.now());
                console.log(Date.now() > (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10) 
                + parseInt(this.state.channels[index]['Δ_TR'],10))*1000);
                console.log(data[index]['State'] != 'closed');
                console.log((Date.now() > ((parseInt(this.state.channels[index]['T_EXP'],10)
                + parseInt(this.state.channels[index]['Δ_TD'],10) + parseInt(this.state.channels[index]['Δ_TR'],10))*1000)))

                if(data[index]['State'] === 'closed'){
                    ret = <div><Label as='a' color='green' horizontal>Channel closed</Label></div>
                }else if(parseInt(this.state.channels[index]['T_EXP'],10)*1000 < Date.now() && Date.now() < 
                (parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000){
                    ret = <div><Label as='a' color='blue' horizontal>Liquidation time</Label></div>
                }
                else if((parseInt(this.state.channels[index]['T_EXP'],10) + parseInt(this.state.channels[index]['Δ_TD'],10))*1000 < Date.now() 
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

            if (data[index]['merchant'] === this.state.accounts[0] /*&& parseInt(this.state.channels[index]['T_EXP'],10)*1000 < Date.now()*/ && 
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
