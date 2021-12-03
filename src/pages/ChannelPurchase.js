import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import factory from '../ethereum/factory';

var sha256 = require('js-sha256');

const EC = require('elliptic').ec;
const elliptic = require('elliptic');

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
      console.log(id)

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
            

            var W= W_X//Buffer.from(W_X,'hex');
            
            var L = 2*(c)+1;
            for(L; L!= n; L--){
              W = sha256(W);
              console.log(W)
              //W = Buffer.from(W,'hex');
            }
            return W;
          };

      const accounts = await web3.eth.getAccounts();

      const i = this.state.microcoin;

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

      await fetch('http://localhost:7000/'+ accounts[0])
      .then(res => {
        return res.json();
      })
      .then(data => {
        console.log('fetch', data);
        data.map((ch, index)=>{

            console.log('datad', data[index])

            if(data[index]['channelID'] === this.state.propsID){
                console.log(data[index])
                this.setState({
                    channel_C_Info: data[index]
                })
            }

        })
      });


      var c = this.state.channelInfo.c;

      const W_iC = W_nX(i, this.state.channel_C_Info['W_LC']).toString('hex');
      console.log(W_iC)

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
          

      // Refresh
      alert('Micro-coin sended');
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
