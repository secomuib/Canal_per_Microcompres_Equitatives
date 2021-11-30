import React, { Component } from 'react';
import { Icon, Button, Dimmer, Loader, Segment, Table, Form, Input, Message, TableRow, TableCell, TableHeader } from 'semantic-ui-react';
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
            console.log(channelsCount)

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
                    console.log('data', data);
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
            const accounts = await web3.eth.getAccounts();
            let channelContract = channel(this.state.channel)
            const c = await channelContract.methods.c().call();
            const v = await channelContract.methods.v().call();
            console.log('c', c);

            const L = c * v;

            function W_nX(n, W_X) {
                var W = Buffer.from(W_X, 'hex');
                var L = 2 * (c) + 1;
                for (L; L != n; L--) {
                    W = sha256(W);
                    W = Buffer.from(W, 'hex');
                }
                return W;
            };

            let W_kM = W_nX(this.state.k, variables.W_LM).toString('hex');

            let W_kC = W_nX(this.state.k, variables.W_LC).toString('hex');

            await channelContract.methods.transferDeposit("0x" + W_kM, "0x" + W_kC, this.state.k, "0x0000000000000000000000000000000000000000").send({ from: accounts[0] })

        } catch (err) {
            this.setState({ errorMessage: err.message });
        } finally {
            this.setState({ loading: false });
        }

    }

    Accept(service_index) {
        console.log('service_index', service_index);

        const W_LM = Buffer.from(elliptic.rand(16)).toString("hex");
        var W = W_LM;

        var L = 2 * (service_index.c) + 1;
        for (L; L != 0; L--) {
            W = sha256(W);
            W = Buffer.from(W, 'hex');
        }
        const id = service_index.channelID;
        console.log(this.state.channels[id - 1]['customer_channel_id'])

        fetch('http://localhost:7000/channels/' + service_index.channelID, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                //"customer_channel_id": this.state.channels[id-1]['customer_channel_id'],
                "State": 'accepted',
                "customer": service_index.customer,
                "merchant": this.state.accounts[0],
                "W_0M": Buffer.from(W).toString("hex"),
                "service": service_index.service,
                "c": service_index.c,
                "S_id": service_index.id,
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                console.log('fetch', data);
            });

        console.log('http://localhost:7000/' + this.state.accounts[0] + '/' + service_index['id'])

        fetch('http://localhost:7000/' + this.state.accounts[0] + '/' + service_index['id'], {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                /*"id": service_index['id'],
                "channel": service_index.channel,
                "customer": service_index.customer,
                "service": service_index.info,
                "c": service_index.c,
                "S_id": service_index.S_id,*/
                "W_LM": Buffer.from(W_LM).toString("hex")
                //"State": "accepted"
            })
        })
            .then(res => {
                return res.json();
            })
            .then(data => {
                console.log('fetch', data);
            });
    }

    /*renderDeliveryRows(sent) {
        var deliveries;
        if (sent) {
            deliveries = this.state.senderDeliveries;
        } else {
            deliveries = this.state.receiverDeliveries;
        }
        return deliveries.map((delivery, index) => {
            return (
                <DeliveryRow
                    key={index}
                    id={index}
                    delivery={delivery}
                    sent={sent}
                />
            );
        });
    }*/

    renderChannels() {

        const data = this.state.channels;

        return Object.keys(data).map((requests, index) => {
            if ((data[index]['customer'] === this.state.accounts[0] || data[index]['merchant'] === this.state.accounts[0]) && data[index]['State'] != 'requested') {
                console.log('dataa', data)
                return (
                    <Table.Row>
                        <Table.Cell>
                            {index}
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

                            <Link to={"/channels/open/" + data[index]['id']}>
                                <Button animated='vertical' color='blue'>
                                    <Button.Content hidden>Open</Button.Content>
                                    <Button.Content visible>
                                        <Icon name='exchange' />
                                    </Button.Content>
                                </Button>
                            </Link>
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
            console.log('channels', channels[index]['State']);
            console.log('channels', channels[index]['merchant']);

            if (channels[index]['State'] === 'requested' && channels[index]['merchant'] === this.state.accounts[0]) {

                return (
                    <Table.Row>
                        <Table.Cell>
                            {index}
                        </Table.Cell>
                        <Table.Cell>
                            {channels[index]['customer']}
                        </Table.Cell>
                        <Table.Cell>
                            {channels[index]['service']}
                        </Table.Cell>
                        <Table.Cell>
                            {/*data[index]['c']*/}
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
                                <Table.HeaderCell style={{ width: "10%" }}>#</Table.HeaderCell>
                                <Table.HeaderCell style={{ width: "30%" }}>Merchant</Table.HeaderCell>
                                <Table.HeaderCell style={{ width: "30%" }}>Customer</Table.HeaderCell>
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

                    <h3><Icon name='sign in alternate' circular />&nbsp;Owned Channels</h3>
                    <Table fixed>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>#</Table.HeaderCell>
                                <Table.HeaderCell>Address</Table.HeaderCell>
                                <Table.HeaderCell>Sender</Table.HeaderCell>
                                <Table.HeaderCell>Message</Table.HeaderCell>
                                <Table.HeaderCell>Action</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>{/*this.renderDeliveryRows(false)*/}</Table.Body>
                    </Table>

                    <h3>Channel payment</h3>
                    <Form onSubmit={this.payment} error={!!this.state.errorMessage}>
                        <Form.Field>
                            <label>Channel address:</label>
                            <Input
                                value={this.state.channel}
                                onChange={event => this.setState({ channel: event.target.value })}
                            />
                        </Form.Field>


                        <Form.Field>
                            <label>k:</label>
                            <Input
                                value={this.state.k}
                                onChange={event => this.setState({ k: event.target.value })}
                            />
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
