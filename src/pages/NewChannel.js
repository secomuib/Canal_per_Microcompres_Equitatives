import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input } from 'semantic-ui-react';
import factory from '../ethereum/factory';
import web3 from '../ethereum/web3';
import variables from '../ethereum/variables';
import db from '../db.json';
import { readFile } from 'fs';
import { identifier } from '@babel/types';

//const fs = require('fs');

var sha256 = require('js-sha256');

class NewChannel extends Component {
  state = {
    c: '',
    v: '',
    service:'',
    T_exp:'',
    TD:'',
    TR:'',
    deposit: '',
    idMerchant:0,
    loading: false,
    merchant:'',
    merchantAddr:'',
    data: '',
    errorMessage: ''
  };

  onSubmit = async event => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: '' });
    const accounts = await web3.eth.getAccounts();


    try {

      fetch('http://localhost:8000/'+this.state.merchantAddr, {
        method:'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "channel": "channelid",
          "customer": accounts[0],
          "service": this.state.service
        })
      })
        .then(res => {
            return res.json();
        })
        .then(data => {
          console.log('fetch',data);  
        })
      
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
        
        alert('Delivery created!');
        // Refresh, using withRouter
        this.props.history.push('/');*/

    } catch (err) {
        this.setState({ errorMessage: err.message });
    } finally {
        this.setState({ loading: false });
    }

  };

  renderMerchants(){
    
    return Object.keys(db['services'][0]).map((merchants, index) =>{
      console.log('merchant', this.state.merchant)
      if(this.state.merchant == ''){
        this.setState({merchant: merchants})
      }
      return(
        <option>{merchants}</option>
      )
    })
  }

  renderServices(merchant){
    console.log('users', Object.keys(db['services'][0]['merchant1'][0]));

    if(merchant!=''){
      //console.log(merchant);
    //}else{
    console.log(Object.keys(db['services'][0][merchant][0]));
    

    //const keys = Object.keys(services.merchant);
    //console.log(keys)
    
    
    return Object.keys(db['services'][0][merchant][0]).map((service, index) =>{
        console.log(service)
        
        return(
               <option>{service}</option>     
      )
      })
    }
    
   
  };

  render() {
    return (
      <div>
        <Link to='/'>Back</Link>
        <h3>Send New Delivery</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage}>
        <Form.Field>
          <label>Select merchant:</label>
        <select value={this.state.merchant} onChange={event =>  {
          this.setState({ merchant: event.target.value, merchantAddr: db['services'][0][event.target.value][0]['Ethereum address']});
          //this.renderServices(event.target.value)
          }
        }>
            {this.renderMerchants()}
        </select>
        </Form.Field>
        <Form.Field>
          <label>Select the merchant service:</label>
          <select value={this.state.service} onChange={event => this.setState({ service: event.target.value })}>
                    {this.renderServices(this.state.merchant)}
          </select>
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
