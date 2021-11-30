import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Table } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import variables from '../ethereum/variables';
import db from '../db.json';
import { readFile } from 'fs';
import { identifier, throwStatement } from '@babel/types';

//const fs = require('fs');

var sha256 = require('js-sha256');


class NewChannel extends Component {
  state = {
    c: '',
    v: '',
    service:'',
    service_price:'',
    T_exp:'',
    TD:'',
    TR:'',
    deposit: '',
    idMerchant:0,
    loading: false,
    merchant:'',
    services:'',
    merchantAddr:'',
    S_id:'',
    data: '',
    C_channels:'',
    channelid:'',
    errorMessage: ''
  };

  componentDidMount(){
    fetch('http://localhost:7000/services2', {
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
          services: data,
        })
       })

  }

  onSubmit = async event => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: '' });
    const accounts = await web3.eth.getAccounts();
    try {

      // Obtain the S_id of the selected service
      const data = this.state.services;
      Object.keys(data).map((merchant, index) => {
        console.log('S_id: ', data[index].info +' '+ data[index].id);
        console.log('service' + this.state.service)
        if(data[index].info === this.state.service){
          console.log('S_id: ', data[index].info +' '+ data[index].id);
          this.setState({
            "S_id": data[index]['id']
          })
        }
      })

        //Customer saved
        await fetch('http://localhost:7000/'+accounts[0], {
        method:'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "channel": "",
          "merchant": this.state.merchant,
          "service": this.state.service,
          "c": this.state.c,
          "S_id": this.state.S_id
        })
      })
        .then(res => {
            return res.json();
        })
        .then(data => {
          this.setState({
            C_channels: data
          }) 
        });
        console.log('C_channels', this.state.C_channels.id)
        await fetch('http://localhost:7000/channels', {
          method:'POST',
          headers: {
            "Content-Type": "application/json"
          },
        body: JSON.stringify({
          "customer": accounts[0],
          "merchant": this.state.merchant,
          "customer_channel_id": this.state.C_channels.id,
          "State": 'requested'
        })
      })
        .then(res => {
            return res.json();
        })
        .then(data => {
          this.setState({
            channelid: data.id
          })  
        });
        //console.log('channelID', this.state.channelid)

        //Merchant saved
        await fetch('http://localhost:7000/'+this.state.merchant, {
        method:'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "channel": "",
          "customer": accounts[0],
          "service": this.state.service,
          "c": this.state.c,
          "S_id": this.state.S_id,
          "channelID": this.state.channelid
        })
      })
        .then(res => {
            return res.json();
        })
        .then(data => {
          console.log('fetch',data);  
        });

        /*
        TRANSACCIÓ CREATECHANNEL
        const accounts = await web3.eth.getAccounts();
        console.log(this.state.c)
        var c = this.state.c;
        function W_nX (n,W_X){
          var W=Buffer.from(W_X,'hex');
          var L = 2*(c)+1;
          for(L; L!= n; L--){
            W = sha256(W);
            W = Buffer.from(W,'hex');
          }
          return W;
        };

        let W_0M = W_nX(0, variables.W_LM).toString('hex');
        let W_0C = W_nX(0, variables.W_LC).toString('hex');


        await factory.methods
            .createChannel("0x"+W_0M, "0x"+W_0C, this.state.service, this.state.c, this.state.v, this.state.T_exp, this.state.TD, this.state.TR)
            .send({ from: accounts[0], value: this.state.deposit, gas:6000000 });
        */
        alert('Delivery created!');
        // Refresh, using withRouter
        this.props.history.push('/');

    } catch (err) {
        this.setState({
          errorMessage: err.message
        });
    } finally {
        this.setState({ loading: false });
    }

  };

  renderMerchants(){
    const data = this.state.services;
    const difMerchant = [];
    console.log('renderMerchants')
    

    Object.keys(data).map((merchant, index1) => {
      console.log('1', data[index1]['merchant'])
      difMerchant.push(data[index1]['merchant'])
    })

    let unics = Array.from(new Set(difMerchant))

    console.log(unics);
    
    return Object.keys(unics).map((merchants, index) =>{
      //console.log('merchant', this.state.merchant)
      //console.log('merchaaants', merchants)
      
      if(this.state.merchant == ''){
        this.setState({merchant: merchants})
      }
        return(
          <option>{unics[index]}</option>
        )
      
    })
  }

  renderServices(merchants){
    const data = this.state.services;
    
    return Object.keys(data).map((service, index) => {
      //console.log(data[index].info)
      //console.log(data[index].merchant)
      //console.log('merchants',merchants);
      
      if(data[index].merchant === merchants){
        return(
          <option>
            {data[index].info}
          </option>
        )
      }
    })
  }

  renderServicePrice(){
    const data = this.state.services;
    const S_id = '';
    return Object.keys(data).map((price, index)=>{
      if(data[index].info === this.state.service){
        console.log('info', data[index].info, data[index].price)
        return(data[index].price)
      }
    })
    
  }

  render() {
    return (
      <div>
        <Link to='/'>Back</Link>
        <h3>Send New Delivery</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage}>
        <Form.Field>
          <label>Select merchant:</label>
        <select value={this.state.merchant} onChange={event =>  {
          this.setState({ merchant: event.target.value/*, merchantAddr: db['services'][0][event.target.value][0]['Ethereum address']*/});
          //this.renderServices(event.target.value)
          }
        }>
          <option></option>
            {this.renderMerchants()}
        </select>
        </Form.Field>
        <Form.Field>
          <label>Select the merchant service:</label>
          <select value={this.state.service} onChange={event => this.setState({ service: event.target.value })}>
            <option></option>
            {this.renderServices(this.state.merchant)}  
          </select>
        </Form.Field>
        <Form.Field>
          <label>Service price:</label>
          <Input>{this.renderServicePrice()}</Input>
        </Form.Field>
        <Form.Field>
          <label>Number of µ-coins to be introduced in the channel:</label>
          <Input
            value={this.state.c}
            onChange={event => this.setState({ c: event.target.value })}
          />
        </Form.Field>

          {/*<Form.Field>
            <label>Number of micro-coins (c):</label>
            <Input
              value={this.state.c}
              onChange={event => this.setState({ c: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Micro-coins value (v):</label>
            <Input
              value={this.state.v}
              onChange={event => this.setState({ v: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Service identifier:</label>
            <Input
              value={this.state.service}
              onChange={event => this.setState({ service: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Expiration date (T_exp):</label>
            <Input
              value={this.state.T_exp}
              onChange={event => this.setState({ T_exp: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Deposit period (TD):</label>
            <Input
              value={this.state.TD}
              onChange={event => this.setState({ TD: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Payback period (TR):</label>
            <Input
              value={this.state.TR}
              onChange={event => this.setState({ TR: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Deposit = c * v</label>
            <Input
              label="wei"
              labelPosition="right"
              value={this.state.deposit}
              onChange={event => this.setState({ deposit: event.target.value })}
            />
          </Form.Field>*/}

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Send!
          </Button>
        </Form>
      </div>
    );
  }
}

export default withRouter(NewChannel);
