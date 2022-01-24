import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import factory from '../ethereum/factory';
import channel from '../ethereum/channel';


var sha256 = require('js-sha256');

const elliptic = require('elliptic');
const ecies = require('ecies-geth');

class ChannelPurchase extends Component {
  state = {
    microcoin:'',
    channelInfo:'',
    channel_C_Info:'',
    accounts: '',
    propsID: '',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let id = this.props.match.params.id;
        this.setState({
            propsID: id
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

      const accounts = await web3.eth.getAccounts();

      let i, channelContract, time, balance;

      await fetch('http://localhost:7000/channels/' + this.state.propsID)
      .then(res => {
        return res.json();
      })
      .then(data => {
        console.log('fetch', data);
        this.setState({
          channelInfo: data
        })
      });
      //Select the mart contract
      channelContract = channel(this.state.channelInfo.ethAddress);


      //If it is the first purchase, then we check that the smart contract balance is adequate.
      if(!this.state.channelInfo['messages']){
        let c = await channelContract.methods.c.call();
        let v = await channelContract.methods.v.call()
        if(web3.eth.getBalance(this.state.channelInfo.ethAddress) === (c * v)){
          balance = true;
        }
      }

      let T_exp = await channelContract.methods.T_exp().call();
        if(new Date(T_exp*1000) < Date.now()){
          time = true;
        }
      
      if((!this.state.channelInfo['messages'] && balance && time) || (this.state.channelInfo['messages'] && !balance && time)){
        
        if(this.state.channelInfo['messages']){
          i = parseInt(this.state.microcoin,10) + this.state.channelInfo['messages']['i'];
        }else{
          i = this.state.microcoin;
        }
  
        await fetch('http://localhost:7000/'+ accounts[0])
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
        });
  
        var c = this.state.channelInfo.c_init;
  
        let W_iC = W_nX(i, this.state.channel_C_Info['W_LC']).toString('hex');

  
        await fetch('http://localhost:7000/channels/' + this.state.propsID, {
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
      }else{
        alert("Error: the purchase time has expired or the smart contract does not have the correct number of microcoins.");
      }
      
          
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
          <h3>Purchase Channel</h3>
          <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage} hidden={this.state.loading}>

                <Form.Field>
                    <label>µ-coin (odd numbers)</label>
                    <Input
                        value={this.state.microcoin}
                        onChange={event => this.setState({ microcoin: event.target.value })}
                    />
                </Form.Field>

                <Message error header="ERROR" content={this.state.errorMessage} />
                <Button primary loading={this.state.loading}>
                    Send
                </Button>

            </Form>
        </div>
      );
    }
  }

export default withRouter(ChannelPurchase);
