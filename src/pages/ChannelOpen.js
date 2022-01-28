import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader, Checkbox} from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import factory from '../ethereum/factory';
import channel from '../ethereum/channel';

var sha256 = require('js-sha256');

const elliptic = require('elliptic');
const ecies = require('ecies-geth');

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

      const accounts = await web3.eth.getAccounts();

      var channel = await fetch('http://localhost:7000/channels/' + id, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }).then(res => {
          return res.json();
        }).then(data => {
          this.setState({
            channel: data,
          })
        });

      const W_LC = Buffer.from(elliptic.rand(16)).toString("hex");
      var W = Buffer.from(W_LC, 'hex');
      var L = 2*(this.state.channel.c)+1;
      
      for (L; L != 0; L--) {
        W = sha256(W);
        W = Buffer.from(W,'hex');
      }

      W = Buffer.from(W).toString("hex");

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
    /*event.preventDefault();*/
    this.setState({ loading: true, errorMessage: '' });

    try {
      const accounts = await web3.eth.getAccounts();
      let T_EXP = new Date(this.state.T_EXP).getTime() / 1000; //https://ethereum.stackexchange.com/questions/32173/how-to-handle-dates-in-solidity-and-web3
      let T_D = (new Date(this.state.Δ_TD).getTime() / 1000) - T_EXP; 
      let T_R = (new Date(this.state.Δ_TR).getTime() / 1000) - T_EXP - T_D; 

      //Smart contract deployment: (v = service_price)
      const addressChannel = await factory.methods.createChannel(this.state.channel.c, parseInt(this.state.channel.service_price,10))
            .send({ from: accounts[0], value: this.state.channel.c * parseInt(this.state.channel.service_price,10), gas: 6000000 });
      
      //Obtain the channel SC address
      const addresses = await factory.methods.getOwnerChannels(accounts[0]).call();
      const channelAddr = addresses[addresses.length-1];

      //If channel open successfull then we have to set the channel params configuration:
      if (addressChannel) {

        let channelContract = channel(channelAddr)
        await channelContract.methods.setChannelParams("0x" + this.state.channel.W_0M, "0x" + this.state.W_0C, this.state.channel.S_id, this.state.channel.c, parseInt(this.state.channel.service_price,10), T_EXP, T_D, T_R)
        .send({ from: accounts[0] });

        let id = this.props.match.params.id;

        const customerInfo = await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id)
          .then(res => {
            return res.json();
          }).then(data => {
            this.setState({
              customerInfo: data
            })
          });

        //Creation of user customer private and public keys for this channel: 
        const privateKey = elliptic.rand(32);
        const publicKey = await ecies.getPublic(privateKey);


        await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "W_LC": this.state.W_LC,
                "channelID": id, 
                "Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                "Private Key": Buffer.from(privateKey, 'hex').toString('hex')
            })
        }).then(res => {
            return res.json();
          }).then(data => {
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
                "C Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                'T_EXP': T_EXP, 
                'Δ_TD': T_D, 
                'Δ_TR': T_R,
                "W_0C": this.state.W_0C,
                "ethAddress": channelAddr,
                "State": 'opened'
            })
        }).then(res => {
            return res.json();
          }).then(data => {

          });
      }
      
      // Refresh, using withRouter
      this.props.history.push('/');
      
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    };
  }

  reuseChannel = async event => {
    /*event.preventDefault();*/
    this.setState({ loading: true, errorMessage: '' });

    try {
      const accounts = await web3.eth.getAccounts();

      let channelContract = channel(this.state.ethChAddr)

      let T_EXP = await channelContract.methods.T_exp().call();
      
      //T_EXP = new Date(parseInt(T_EXP,10));
      let T_R = await channelContract.methods.TR().call();
      let T_D = await channelContract.methods.TD().call();

      if((Date.now() > (parseInt(T_EXP,10) + parseInt(T_D,10))*1000) && (Date.now() < (parseInt(T_EXP,10) + parseInt(T_D,10) + parseInt(T_R,10))*1000)){
        let T_EXP = new Date(this.state.T_EXP).getTime() / 1000; //https://ethereum.stackexchange.com/questions/32173/how-to-handle-dates-in-solidity-and-web3
        let T_D = (new Date(this.state.Δ_TD).getTime() / 1000) - T_EXP; 
        let T_R = (new Date(this.state.Δ_TR).getTime() / 1000) - T_EXP - T_D;
      
        await channelContract.methods.setChannelParams("0x" + this.state.channel.W_0M, "0x" + this.state.W_0C, this.state.channel.S_id, this.state.channel.c, parseInt(this.state.channel.service_price,10), T_EXP, T_D, T_R)
        .send({ from: accounts[0] });

      let id = this.props.match.params.id;

        //Creation of user customer private and public keys for this channel: 
        const privateKey = elliptic.rand(32);
        const publicKey = await ecies.getPublic(privateKey);

        await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "W_LC": this.state.W_LC,
                "channelID": id, 
                "Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                "Private Key": Buffer.from(privateKey, 'hex').toString('hex')
            })
          }).then(res => {
            return res.json();
          }).then(data => {
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
                "C Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                'T_EXP': T_EXP, 
                'Δ_TD': T_D, 
                'Δ_TR': T_R,
                "W_0C": this.state.W_0C,
                "ethAddress": this.state.ethChAddr,
                "State": 'opened'
            })
        }).then(res => {
            return res.json();
          }).then(data => {
          });
      }else{
        alert("Error: the channel can't be reused.");
      }
      
      // Refresh, using withRouter
      this.props.history.push('/');
      
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    };
  }

  //Function used when the user customer wants to open a new channel, that would be used to transfer the 
  //microcoins received from another channel, where the customer represents de merchant.
  openChannel = async event =>{
    this.setState({ loading: true, errorMessage: '' });
    try {
      const accounts = await web3.eth.getAccounts();
      
      //Smart contract deployment: (v = service_price)
      const addressChannel = await factory.methods.createChannel(this.state.channel.c, parseInt(this.state.channel.service_price,10))
            .send({ from: accounts[0] });

      if(addressChannel){

        //Obtain the channel SC address
        const addresses = await factory.methods.getOwnerChannels(accounts[0]).call();
        const channelAddr = addresses[addresses.length-1];

        let id = this.props.match.params.id;

        //Creation of user customer private and public keys for this channel: 
        const privateKey = elliptic.rand(32);
        const publicKey = await ecies.getPublic(privateKey);

        await fetch('http://localhost:7000/' + accounts[0] + '/' + this.state.channel.customer_channel_id, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "W_LC": this.state.W_LC,
                "channelID": id, 
                "Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                "Private Key": Buffer.from(privateKey, 'hex').toString('hex')
            })
        }).then(res => {
            return res.json();
          }).then(data => {
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
                "C Public Key": Buffer.from(publicKey, 'hex').toString('hex'),
                "W_0C": this.state.W_0C,
                "ethAddress": channelAddr,
                "State": 'opened- waiting configuration'
            })
        }).then(res => {
            return res.json();
          }).then(data => {
            console.log('fetch', data);
          });
      }
      // Refresh, using withRouter
      this.props.history.push('/');
      
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    };
  }

  //Function used when the user customer wants to transfer the micro-coins obtained from another
  //channel to the new channel that would be opened, and expend this micro-coins with a merchant services.
  onTransfer = async event => {

    this.setState({ loading: true, errorMessage: '' });

    try {

        const accounts = await web3.eth.getAccounts();
        let T_EXP = new Date(this.state.T_EXP).getTime() / 1000; //https://ethereum.stackexchange.com/questions/32173/how-to-handle-dates-in-solidity-and-web3
        let T_D = (new Date(this.state.Δ_TD).getTime() / 1000) - T_EXP; 
        let T_R = (new Date(this.state.Δ_TR).getTime() / 1000) - T_EXP - T_D;

        let channelContract = channel(this.state.channel.ethAddress);

        await channelContract.methods.setChannelParams("0x" + this.state.channel.W_0M, "0x" + this.state.channel.W_0C, this.state.channel.S_id, this.state.channel.c, parseInt(this.state.channel.service_price,10), T_EXP, T_D, T_R)
        .send({ from: accounts[0] });

        let id = this.props.match.params.id;

        await fetch('http://localhost:7000/channels/' + id, {
            method: 'PATCH',
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              'T_EXP': T_EXP, 
              'Δ_TD': T_D, 
              'Δ_TR': T_R,
              "State": 'opened'
            })
        }).then(res => {
            return res.json();
          }).then(data => {
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

  render() {

    return (
      <div>
        <Dimmer inverted active={this.state.loading}>
          <Loader inverted content='Loading...'></Loader>
        </Dimmer>
        <Link to='/'>Back</Link>
        
        <Form error={!!this.state.errorMessage} hidden={this.state.loading}>
          <h3>New Channel - Open</h3>

          <Form.Field>
            <label>T <sub>EXP</sub></label>
            <Input
              value={this.state.T_EXP}
              type="datetime-local"
              onChange={event => this.setState({ T_EXP: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input
              value={this.state.Δ_TD}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TD: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input
              value={this.state.Δ_TR}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TR: event.target.value })}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading} style={{"margin-left": 0} } 
                onClick={() => this.onSubmit()} hidden={this.state.loading}>
            Open Channel
          </Button>
        </Form>

        <Form error={!!this.state.errorMessage} hidden={this.state.loading}>
          <h3>Reuse Channel</h3>

          <Form.Field>
            <label>Ethereum channel address</label>
            <Input
              value={this.state.ethChAddr}
              onChange={event => this.setState({ ethChAddr: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>T <sub>EXP</sub></label>
            <Input
              value={this.state.T_EXP}
              type="datetime-local"
              onChange={event => this.setState({ T_EXP: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input
              value={this.state.Δ_TD}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TD: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input
              value={this.state.Δ_TR}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TR: event.target.value })}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading} style={{"margin-left": 0} } 
                onClick={() => this.reuseChannel()} hidden={this.state.loading}>
            Open Channel
          </Button>
        </Form>


        <Form error={!!this.state.errorMessage} hidden={this.state.loading}>
        <h3>Open Transfer Channel</h3>
        <h4>Open channel
          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading} style={{"margin-left": 100}}
                onClick={() => this.openChannel()} hidden={this.state.loading}>
            Open Channel
          </Button>
        </h4>
        </Form>

        <Form error={!!this.state.errorMessage} hidden={this.state.loading} style={{"margin-top": 30}}>
          <h4>Parameters Configuration</h4>
          <Form.Field>
            <label>T <sub>EXP</sub></label>
            <Input
              value={this.state.T_EXP}
              type="datetime-local"
              onChange={event => this.setState({ T_EXP: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input
              value={this.state.Δ_TD}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TD: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input
              value={this.state.Δ_TR}
              type="datetime-local"
              onChange={event => this.setState({ Δ_TR: event.target.value })}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading} style={{"margin-bottom": 20}} 
                onClick={() => this.onTransfer()} hidden={this.state.loading}>
            Transfer Channel
          </Button>
        </Form>
      </div>
    );
  }
}

export default withRouter(ChannelOpen);
