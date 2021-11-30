import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import factory from '../ethereum/factory';

var sha256 = require('js-sha256');

const EC = require ('elliptic').ec;
const elliptic = require ('elliptic');

class ChannelOpen extends Component {
  state = {
    T_EXP:'',
    Δ_TR:'',
    Δ_TD: '',
    W_LC:'',
    W_0C:'',
    channel:'',
    accounts:'',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {

        let id = this.props.match.params.id;
        console.log(id)

        const accounts = await web3.eth.getAccounts();

        var channel = await fetch('http://localhost:7000/channels/'+id, {
            headers:{
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
        })
        .then(res =>{
            //console.log('response ',res);
            return res.json();
        }).then(data =>{
            console.log('data', data);
            this.setState({
            channel: data,
            })
        })
        const W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
        var W = W_LC;

        var L = 2//2*(this.state.channel.c)+1;
        for(L; L!= 0; L--){
            W = sha256(W);
            //console.log(W)
            //W = Buffer.from(W,'hex');
        }   

        W = Buffer.from(W).toString("hex");

        this.setState({
            W_LC: W_LC,
            W_0C: W,
            accounts:accounts
        })
        console.log('W_LC', this.state.W_LC, 'W_0C', this.state.W_0C);
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  onSubmit = async event => {
    event.preventDefault();

    console.log('http://localhost:7000/'+ this.state.accounts[0]);
    const customerInfo = await fetch('http://localhost:7000/'+this.state.accounts[0]+'/'+this.state.channel.customer_channel_id)
        .then(res => {
            return res.json();
        })
        .then(data => {
        console.log('fetch',data); 
        this.setState({
            customerInfo: data
        }) 
        });

    await fetch('http://localhost:7000/'+ this.state.accounts[0] +'/'+ this.state.channel.customer_channel_id, {
            method:'PUT',
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "channel": this.state.customerInfo.channel,
                "merchant": this.state.customerInfo.merchant,
                "service": this.state.customerInfo.service,
                "c": this.state.customerInfo.c,
                "S_id": this.state.customerInfo.S_id,
                "W_LC": this.state.W_LC
            })
          })
            .then(res => {
                return res.json();
            })
            .then(data => {
              console.log('fetch',data); 
              this.opentransaction();

            });
            

            
    // Refresh, using withRouter
    //this.props.history.push('/');
  };

  async opentransaction (){

    const accounts = await web3.eth.getAccounts();

      console.log('opentransaction')
    console.log(this.state.channel.W_0M, this.state.W_0C, this.state.channel.S_id, this.state.channel.c, 1, this.state.T_EXP, this.state.Δ_TD, this.state.Δ_TR)
            
    await factory.methods.createChannel("0x"+this.state.channel.W_0M, "0x"+this.state.W_0C, this.state.channel.S_id, this.state.channel.c, 1, this.state.T_EXP, this.state.Δ_TD, this.state.Δ_TR)
   .send({ from: accounts[0], value: this.state.channel.c*1, gas:6000000 });

  }

  render() {
    
    return (
      <div>
        <Dimmer inverted active={this.state.loading}>
          <Loader inverted content='Loading...'></Loader>
        </Dimmer>
        <Link to='/'>Back</Link>
        <h3>Open Channel</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage} hidden={this.state.loading}>
          <Form.Field>
            <label>T <sub>EXP</sub></label>
            <Input 
            value={this.state.T_EXP}
            onChange={event => this.setState({ T_EXP: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input 
            value={this.state.Δ_TD}
            onChange={event => this.setState({Δ_TD : event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input 
            value={this.state.Δ_TR}
            onChange={event => this.setState({Δ_TR : event.target.value })}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Open Channel
          </Button>
        </Form>
      </div>
    );
  }
}
export default withRouter(ChannelOpen);
