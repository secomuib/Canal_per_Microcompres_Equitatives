import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import factory from '../ethereum/factory';

var sha256 = require('js-sha256');

const EC = require('elliptic').ec;
const elliptic = require('elliptic');

class ChannelOpen extends Component {
  state = {
    T_EXP: '',
    Δ_TR: '',
    Δ_TD: '',
    W_LC: '',
    W_0C: '',
    customerInfo: '',
    channel: '',
    accounts: '',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {

      let id = this.props.match.params.id;
      console.log(id)

      const accounts = await web3.eth.getAccounts();

      var channel = await fetch('http://localhost:7000/channels/' + id, {
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
            channel: data,
          })
        })
      //const W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
      const W_LC = '8a9bcf1e51e812d0af8465a8dbcc9f741064bf0af3b3d08e6b0246437c19f7fb';
      var W = Buffer.from(W_LC, 'hex'); //W_LC;
      console.log(W);
      var L = 2*(this.state.channel.c)+1;
      for (L; L != 0; L--) {
        W = sha256(W);
        console.log(W)
        W = Buffer.from(W,'hex');
      }

      W = Buffer.from(W).toString("hex");
      console.log('W final', W)

      console.log('W_LC', this.state.W_LC, 'W_0C', this.state.W_0C);

      /*const customerInfo = await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id)
        .then(res => {
          return res.json();
        })
        .then(data => {
          console.log('fetch', data);
          this.setState({
            customerInfo: data
          })
        });
      

      await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "channel": this.state.customerInfo.channel,
          "merchant": this.state.customerInfo.merchant,
          "service": this.state.customerInfo.service,
          "c": this.state.customerInfo.c,
          "S_id": this.state.customerInfo.S_id,
          "channelID": 
        })
      })
        .then(res => {
          return res.json();
        })
        .then(data => {
          this.setState({
            data: data
          })
          
        });*/

      this.setState({
        W_LC: W_LC,
        W_0C: W,
        accounts: accounts
      })

    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  onSubmit = async event => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: '' });

    try {
      const accounts = await web3.eth.getAccounts();
      let T_EXP = new Date(this.state.T_EXP).getTime() / 1000;
      console.log(T_EXP);
      console.log(new Date(T_EXP * 1000)) //https://ethereum.stackexchange.com/questions/32173/how-to-handle-dates-in-solidity-and-web3

      console.log(this.state.channel.W_0M, this.state.W_0C, this.state.channel.S_id, this.state.channel.c, 1, T_EXP, this.state.Δ_TD, this.state.Δ_TR)
      console.log(web3.utils.toWei((this.state.channel.c * 1).toString(),'ether'))
      alert('wait');
      const addressChannel = await factory.methods.createChannel("0x" + this.state.channel.W_0M, "0x" + this.state.W_0C, this.state.channel.S_id, this.state.channel.c, web3.utils.toWei('1','ether'), T_EXP, this.state.Δ_TD, this.state.Δ_TR)
        .send({ from: accounts[0], value: web3.utils.toWei((this.state.channel.c * 1).toString(),'ether'), gas: 6000000 })
      
      //Obtain the channel SC address
      const addresses = await factory.methods.getOwnerChannels(accounts[0]).call()
      const channelAddr = addresses[addresses.length-1];
      
      if (addressChannel) {

        let id = this.props.match.params.id;

        const customerInfo = await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id)
          .then(res => {
            return res.json();
          })
          .then(data => {
            console.log('fetch', data);
            this.setState({
              customerInfo: data
            })
          });


        await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id, {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "W_LC": this.state.W_LC,
            "channelID": id
          })
        })
          .then(res => {
            return res.json();
          })
          .then(data => {
            this.setState({
              data: data
            })

          });

        await fetch('http://localhost:7000/channels/' + id, {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "W_0C": this.state.W_0C,
            "ethAddress": channelAddr,
            "State": 'opened'
          })
        })
          .then(res => {
            return res.json();
          })
          .then(data => {
            console.log('fetch', data);

          });
      }
      // Refresh
      alert('Channel opened');
      // Refresh, using withRouter
      this.props.history.push('/');
      
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    };
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
              type="date"
              onChange={event => this.setState({ T_EXP: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input
              value={this.state.Δ_TD}
              onChange={event => this.setState({ Δ_TD: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input
              value={this.state.Δ_TR}
              onChange={event => this.setState({ Δ_TR: event.target.value })}
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
