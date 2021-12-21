import React, { Component } from 'react';
import { Icon, Button, Dimmer, Loader, Segment, Table, Form, Input, Message, TableRow, TableCell, TableHeader, Label } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import factory from '../ethereum/factory';
import channel from '../ethereum/channel';
import variables from '../ethereum/variables';
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
        loadingPage: true,
        loading: false,
        errorMessage: '',
        accounts: ''
    };

    componentDidMount = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const channelsCount = await factory.methods.getChannelsCount().call();
            //console.log(channelsCount)

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
                    //console.log('response ',res);
                    return res.json();
                }).then(data => {
                    //console.log('data', data);
                    this.setState({
                        user_db: data,
                        accounts: accounts
                    })
                });

            const channels = fetch('http://localhost:7000/channels', {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(res => {
                    //console.log('response ',res);
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
            //console.log('user_Db',this.state.user_db)
            
            /*const receiverDeliveriesCount = await factory.methods.getReceiverDeliveriesCount(accounts[0]).call();
            
            const senderDeliveries = await Promise.all(
                Array(parseInt(senderDeliveriesCount))
                  .fill()
                  .map((delivery, index) => {
                    return factory.methods.senderDeliveries(accounts[0], index).call();
                  })
              );

              const receiverDeliveries = await Promise.all(
                Array(parseInt(receiverDeliveriesCount))
                  .fill()
                  .map((delivery, index) => {
                    return factory.methods.receiverDeliveries(accounts[0], index).call();
                  })
              );

            this.setState({ 
                senderDeliveries: senderDeliveries, 
                receiverDeliveries: receiverDeliveries,
                accounts: accounts
            });*/

        } finally {
            this.setState({ loadingPage: false })
        }
    }

    //Funció per transferir part de les micro-monedes de deposit del canal a la wallet del comprador
    payment = async event => {
        event.preventDefault();
        this.setState({ loading: true, errorMessage: '' });

        try {
            //console.log('ldw',this.state.channelID)
            let channel_info;
            let W_kC, W_kM;
            let L;

            function W_nX (i, j, W_X){
                var W= Buffer.from(W_X,'hex'); //W_X
                console.log('i', i)
                console.log('j', j)
                console.log('W',W)
                //var L = 2*(c)+1;
                for(i; i!= j; i--){
                  W = sha256(W);
                  console.log('W',W)
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

            console.log('this.state.k', this.state.k)
            console.log('channel[j]', channel_info['j'])
            let ind; 

            this.state.channels.map((chn, index) => {
                if(this.state.channels[index]['id'] === parseInt(this.state.channelID,10)){
                    ind = index;
                }
            })

            if(parseInt(this.state.k, 10) === (channel_info['j']-1)){
                W_kC = this.state.channels[ind]['messages']['m1'];
                console.log('W_kC', W_kC)
            }else{
                W_kC = W_nX( channel_info['j'], this.state.k, this.state.channels[ind]['W_ic'])
                console.log('W_kC', W_kC)
            }

            L = 2*(channel_info['c'])+1;
            
            W_kM = W_nX(L, this.state.k, channel_info['W_LM'])

            const accounts = await web3.eth.getAccounts();
            let channelContract = channel(this.state.channels[ind]['ethAddress'])
            console.log("0x" + W_kM, "0x" + W_kC, this.state.k, "0x0000000000000000000000000000000000000000")
            console.log(channelContract)
            console.log('W_kM', W_kM)
            console.log('W_kC', W_kC)
            console.log('k', this.state.k)

            await channelContract.methods.transferDeposit("0x" + W_kM, "0x" + W_kC, this.state.k, "0x0000000000000000000000000000000000000000")
            .send({ from: accounts[0] });
            
        } catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }
    }

    Accept(channel_ID) {
        //console.log('channel_ID', channel_ID);
        //console.log(this.state.user_db);
        const data = this.state.user_db
        //console.log('data', data);
        let merchant_ch;

        data.map((ch, index) => {
            //console.log(this.state.user_db[index]['channelID']);
            if (channel_ID === data[index]['channelID']) {
                merchant_ch = data[index];
            }
            //console.log(merchant_ch)
        })
        //const W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
        const W_LM = '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225';
        let W = Buffer.from(W_LM,'hex');//W_LM;

        let L = 2 * (merchant_ch.c) + 1;
        for (L; L != 0; L--) {
            W = sha256(W);
            console.log('W', W)
            W = Buffer.from(W, 'hex');
        }

        W = Buffer.from(W).toString("hex");

        console.log('W prova', W.toString('hex'))
        const id = merchant_ch.channelID;
        //console.log(this.state.channels[id - 1]['customer_channel_id'])
        alert('W prova', W.toString('hex'))
        fetch('http://localhost:7000/channels/' + merchant_ch.channelID, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                //"customer_channel_id": this.state.channels[id-1]['customer_channel_id'],
                "State": 'accepted',
                "customer": merchant_ch.customer,
                "merchant": this.state.accounts[0],
                "W_0M": W,//Buffer.from(W).toString("hex"),
                "service": merchant_ch.service,
                "c": merchant_ch.c,
                "S_id": merchant_ch.id,
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                console.log('fetch', data);
            });

        //console.log('http://localhost:7000/' + this.state.accounts[0] + '/' + merchant_ch['id'])

        fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + merchant_ch['id'], {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "W_LM": W_LM,//Buffer.from(W_LM).toString("hex"),
                "j": 0
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                console.log('fetch', data);
            });
    }

    //Send m2
    send = async (data) => {
        //console.log('data index', data)
        //console.log(this.state.user_db)
        var index_userChannel;

        let address = data['ethAddress']
        //console.log(address)
        let channelContract = channel(address);
        console.log(channelContract)
        const T_EXP = await channelContract.methods.T_exp().call()

        if(Date.now() < T_EXP*1000){

        }
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id']){
                index_userChannel = index;
            }
        })
        console.log('index user channel', index_userChannel);
        console.log(this.state.user_db[index_userChannel]['j'])
        console.log(data['messages']['i'])

        function W_nX (i, j, W_X){
            var W= Buffer.from(W_X,'hex'); //W_X
            
            //var L = 2*(c)+1;
            for(i; i!= j; i--){
              W = sha256(W);
              // console.log(W)
              W = Buffer.from(W,'hex');
            }

            W = Buffer.from(W).toString("hex");
            console.log('W sha256', W);
            return W;
        };

        var c = data['c'];
        console.log('data[messages][i]', data['messages']['i']);
        console.log(this.state.user_db[index_userChannel]['j']);
        console.log(data['messages']['m1']);

        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], data['messages']['m1'])
        
        //const W_ic = 'W_'+this.state.user_db[index_userChannel]['j']+'C';
          console.log('i', data['messages']['i'])
          console.log('j', this.state.user_db[index_userChannel]['j']);
          console.log(hash)
          console.log('data', data['messages']['m1']);
          console.log('Wic', data['W_0C']);
        
          var W_ic;

        //Not the first payement
        if(data['W_ic']){
            W_ic = data['W_ic'];
        }
        //Is the first payement:
        else{
            W_ic = data['W_0C'];
        }

        if((data['messages']['i'] > this.state.user_db[index_userChannel]['j']) && (hash === W_ic)){
            fetch('http://localhost:7000/channels/' + data['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    "State": 'send service',
                    "W_ic":data['messages']['m1'],
                    "messages":{
                        "i": data['messages']['i'],
                        "m1": data['messages']['m1'],
                        "m2": data['service']
                    }
                })
                })
                .then(res => {
                    //console.log('response',res);
                    return res.json();
                }).then(data => {
                    this.setState({
                        channels: data
                    })
                });

                console.log('http://localhost:7000/' + this.state.accounts[0] + '/' + (index_userChannel+1));
                alert('hello');

                fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + (index_userChannel+1), {
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "j": data['messages']['i']
                    })
                    })
                    .then(res => {
                        //console.log('response ',res);
                        return res.json();
                    }).then(data => {
                        this.setState({
                            channels: data
                        })
                    })
           
        }else{
            alert('The micro coin is not valid!')
        }


        //Verify i>j and M forms part of the chain

    }

    sendProof(data){
        //TODO: DECRYPT M2

        console.log('data index', data)
        console.log(this.state.user_db)
        var index_userChannel;
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id'].toString()){
                index_userChannel = index;
            }
        })

        function W_nX (n, W_X){
            
            var W = Buffer.from(W_X,'hex');//W_X
            
            var L = 2*(c)+1;
            for(L; L!= n; L--){
              W = sha256(W);
              console.log(W)
              W = Buffer.from(W,'hex');
            }
            W =  Buffer.from(W).toString("hex");
            return W;
          };

        var c = data['c'];
        console.log('W_LC',this.state.user_db[index_userChannel]['W_LC'])
        var hash = W_nX(parseInt(data['messages']['i'],10)+1, this.state.user_db[index_userChannel]['W_LC'])

        console.log('hash', hash);
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
                });
    }
    verify(data){
        //TODO: DECRYPT M3

        console.log('data index', data)
        console.log(this.state.user_db)
        var index_userChannel;
        this.state.user_db.map((info, index)=>{
            if(this.state.user_db[index]['channelID'] === data['id']){
                index_userChannel = index;
            }
        })
        console.log('index user channel', index_userChannel);
        console.log('j',this.state.user_db[index_userChannel]['j']);
        console.log('i',data['messages']['i'])

        function W_nX (i, j, W_X){
            var W= Buffer.from(W_X,'hex'); //W_X
            console.log(W)
            //var L = 2*(c)+1;
            for(i; i!= j; i--){
            W = sha256(W);
            W = Buffer.from(W,'hex');
            }
            W = Buffer.from(W).toString("hex");
            return W;
        };

        //var c = data['c'];
        var hash = W_nX(data['messages']['i'], this.state.user_db[index_userChannel]['j'], data['messages']['m3'])
        console.log(hash);

        if(hash === data['W_ic']){
            fetch('http://localhost:7000/channels/' + data['id'], {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "State": 'opened',
                    W_ic:data['messages']['m3']
                })
            })
            .then(res => {
                //console.log('response ',res);
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            });

            //Update j
            fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + (index_userChannel+1), {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "j": data['messages']['i']
                })
            })
            .then(res => {
                //console.log('response ',res);
                return res.json();
            }).then(data => {
                this.setState({
                    channels: data
                })
            })
        }
    }

    renderChannels() {

        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            console.log('hola',data[index]['customer'])
            if (data[index]['customer'] === this.state.accounts[0] || data[index]['merchant'] === this.state.accounts[0]) {
                console.log('dataa', data)
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
                            {data[index]['State'] === 'accepted' && data[index]['customer'] === this.state.accounts[0] ? (
                                <Link to={"/channels/open/" + data[index]['id']}>
                                    <Button animated='vertical' color='blue'>
                                        <Button.Content hidden>Open</Button.Content>
                                        <Button.Content visible>
                                            <Icon name='exchange' />
                                        </Button.Content>
                                    </Button>
                                </Link>
                            ) : (data[index]['State'] === 'opened' && data[index]['customer'] === this.state.accounts[0] ? (
                                <Link to={"/channels/purchase/" + data[index]['id']}>
                                    <Button animated='vertical' color='blue'>
                                        <Button.Content hidden>Purchase</Button.Content>
                                        <Button.Content visible>
                                            <Icon name='exchange' />
                                        </Button.Content>
                                    </Button>
                                </Link>
                            ):(data[index]['State'] === 'payment' && data[index]['merchant'] === this.state.accounts[0] ? (
                                
                                <Button animated='vertical' color='blue' onClick={() => this.send(data[index])}>
                                    <Button.Content hidden>Send</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='exchange' />
                                    </Button.Content>
                                </Button>
                                

                            ):(data[index]['State'] === 'payment' && data[index]['customer'] === this.state.accounts[0] ? (
                                
                                <Link to={"/channels/purchase/" + data[index]['id']}>
                                    <Button animated='vertical' color='yellow'>
                                        <Button.Content hidden>Send</Button.Content>
                                        <Button.Content visible>
                                            <Icon name='exchange' />
                                        </Button.Content>
                                    </Button>
                                </Link>

                            ):(data[index]['State'] === 'opened' && data[index]['merchant'] === this.state.accounts[0] ? (
                                <Label as='a' color='green' horizontal>Opened</Label>
                            ):(data[index]['State'] === 'send service' && data[index]['merchant'] === this.state.accounts[0] ? ( 
                                <Label as='a' color='blue' horizontal>Waiting proof</Label>
                            ):(data[index]['State'] === 'send service' && data[index]['customer'] === this.state.accounts[0] ? (
                                
                                <Button animated='vertical' color='yellow' onClick={() => this.sendProof(data[index])}>
                                    <Button.Content hidden>Proof</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='exchange' />
                                    </Button.Content>
                                </Button>

                            ):(data[index]['State'] === 'send proof' && data[index]['customer'] === this.state.accounts[0] ? ( 
                                <Label as='a' color='orange' horizontal>Waiting M verification</Label>
                            ):(data[index]['State'] === 'send proof' && data[index]['merchant'] === this.state.accounts[0] ? (
                                
                                <Button animated='vertical' color='yellow' onClick={() => this.verify(data[index])}>
                                    <Button.Content hidden>Verify</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='check' />
                                    </Button.Content>
                                </Button>

                            ):(<></>)
                            ))))))))}
                        </Table.Cell>
                    </Table.Row>
                )
            }
        })


        /*return this.state.openChannels.map((channel, index) =>{
            return(
                <Table.Row>
                    <Table.Cell>
                        {channel}
                    </Table.Cell>    
                </Table.Row>
            )
        })*/

    };

    renderRequests() {
        const channels = this.state.channels;
        console.log(this.state.channels)
        return Object.keys(channels).map((channel, index) => {
            //console.log('channels', channels[index]['State']);
            //console.log('channels', channels[index]['merchant']);

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
            
            if (data[index]['merchant'] === this.state.accounts[0]) {
                console.log('dataa', data[index]['id'])
                return(
                    <option>{data[index]['id']}</option>
                )
            }
        })
    }

    rendermicroCoins (channelID) {
        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            console.log(data[index]['id']);
            console.log(channelID)
            let coins = [];

            if (data[index]['id'] === parseInt(channelID,10)) {
                
                console.log('customer info', this.state.user_db)
                let j;
                Object.keys(this.state.user_db).map((chn, index)=>{
                    console.log('channelID 1',this.state.user_db[index]['channelID'])
                    console.log('channelID 2',channelID)

                    if(this.state.user_db[index]['channelID'] === parseInt(channelID,10)){
                        console.log('j', this.state.user_db[index]['j'])
                        j = this.state.user_db[index]['j'];
                        
                        for(j; j!= 0; j--){
                            console.log('j', j);
                            coins.push(j)
                            /*if(j%2 === 1){ 
                                coins.push(j);
                            }*/
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
                        <Form onSubmit={this.payment} error={!!this.state.errorMessage}>

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

                    </div>)
                }
                {/*<h3><Icon name='sign out alternate' circular />&nbsp;Sent deliveries</h3>
                <Table fixed>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>#</Table.HeaderCell>
                            <Table.HeaderCell>Address</Table.HeaderCell>
                            <Table.HeaderCell>Receiver</Table.HeaderCell>
                            <Table.HeaderCell>Message</Table.HeaderCell>
                            <Table.HeaderCell>Action</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>{this.renderDeliveryRows(true)}</Table.Body>
                </Table>
                <Link to="/deliveries/new">
                    <Button
                        content = "Send New Delivery"
                        icon = "add circle"
                        primary = {true}
                        />
                </Link>*/}
            </div>
        );
    }
}

export default Home;
