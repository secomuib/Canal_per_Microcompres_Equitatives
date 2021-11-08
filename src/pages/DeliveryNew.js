import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input } from 'semantic-ui-react';
import factory from '../ethereum/factory';
import web3 from '../ethereum/web3';
import variables from '../ethereum/variables';

var sha256 = require('js-sha256');

class DeliveryNew extends Component {
  state = {
    c: '',
    v: '',
    service:'',
    T_exp:'',
    TD:'',
    TR:'',
    deposit: '',
    loading: false,
    errorMessage: ''
  };

  onSubmit = async event => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: '' });

    try {
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
        this.props.history.push('/');

    } catch (err) {
        this.setState({ errorMessage: err.message });
    } finally {
        this.setState({ loading: false });
    }

  };

  render() {
    return (
      <div>
        <Link to='/'>Back</Link>
        <h3>Send New Delivery</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage}>
          <Form.Field>
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
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Send!
          </Button>
        </Form>
      </div>
    );
  }
}

export default withRouter(DeliveryNew);
