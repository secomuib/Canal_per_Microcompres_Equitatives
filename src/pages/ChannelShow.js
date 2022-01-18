import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader, FormSelect } from 'semantic-ui-react';
import web3 from '../ethereum/web3';

import channelSC from '../ethereum/channel';

class ChannelShow extends Component {
  state = {
    channel:'',
    accounts: '',
    T_EXP: '',
    Δ_TD: '',
    Δ_TR: '',
    ID_userChannel: '',
    balance: '',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let id = this.props.match.params.id;

      var channel = await fetch('http://localhost:7000/channels/'+id, {
        headers:{
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      .then(res =>{
        return res.json();
      }).then(data =>{
        this.setState({
          channel: data,
        })
       })

      const accounts = await web3.eth.getAccounts();

      if(this.state.channel.ethAddress){
        let channelContract = channelSC(this.state.channel.ethAddress)
        let start = await channelContract.methods.start().call();
        let T_EXP = await channelContract.methods.T_exp().call();
        let Δ_TD = await channelContract.methods.TD().call();
        let Δ_TR = await channelContract.methods.TR().call();
        let blocktimestamp = await channelContract.methods.blocktimestamp().call();

        let start_format = new Date(start*1000);

        let T_EXP_format = new Date(T_EXP*1000);

        let Δ_TD_format = new Date((parseInt(T_EXP,10) + parseInt(Δ_TD,10))*1000);

        let Δ_TR_format = new Date((parseInt(T_EXP,10) + parseInt(Δ_TD,10) + parseInt(Δ_TR,10))*1000);

        await fetch('http://localhost:7000/' + accounts[0], {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          }
      })
          .then(res => {
              return res.json();
          }).then(data => {
              this.setState({
                  user_db: data,
              })
          });


        let ID_userChannel;

        this.state.user_db.map((info, index)=>{

          if(parseInt(id, 10) === this.state.user_db[index]['channelID']){
              ID_userChannel = index;
          }

        });

      console.log(ID_userChannel)

        this.setState({
          T_EXP: T_EXP_format,
          Δ_TD: Δ_TD_format,
          Δ_TR: Δ_TR_format,
          accounts: accounts,
          ID_userChannel: ID_userChannel
        });
      }
      let balance;

      web3.eth.getBalance(this.state.channel.ethAddress, function(err, result) {
        if (err) {
          console.log(err)
        } else {
          balance = web3.utils.fromWei(result, "ether") * 1000000000000000000;
        }
      }).then(res => {
          this.setState({
            balance: balance
          })
      });

    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  onSubmit = async event => {
    event.preventDefault();

    // Refresh, using withRouter
    this.props.history.push('/');
  };

  render() {
    
    return (
      <div>
        <Dimmer inverted active={this.state.loading}>
          <Loader inverted content='Loading...'></Loader>
        </Dimmer>
        <Link to='/'>Back</Link>
        <h3>Show Channel</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage} hidden={this.state.loading}>
          <Form.Field>
            <label>Merchant</label>
            <Input
              readOnly
              value={this.state.channel.merchant}
            />
          </Form.Field>

          <Form.Field>
            <label>Customer</label>
            <Input
              readOnly
              value={this.state.channel.customer}
            />
          </Form.Field>

          <Form.Field>
            <label>Channel ID</label>
            <Input
              readOnly
              value={this.state.channel.id}
            />
          </Form.Field>

          <Form.Field>
            <label>Service</label>
            <Input
              readOnly
              value={this.state.channel.service}
            />
          </Form.Field>

          <Form.Field>
            <label>Service price</label>
            <Input
              label="wei"
              labelPosition="right"
              readOnly
              value={this.state.channel.service_price}
            />
          </Form.Field>

          <Form.Field>
            <label>µ-coins</label>
            <Input
              label="wei"
              labelPosition="right"
              value={this.state.channel.c}
            />
          </Form.Field>
        {(this.state.channel.State === 'accepted' || this.state.channel.State === 'opened- waiting configuration' || 
        this.state.channel.State === 'opened' ||  this.state.channel.State === 'payment' || 
        this.state.channel.State === 'send service'|| this.state.channel.State === 'send proof') && (
        <Form.Field>
            <label>W<sub>0M</sub></label>
            <Input
              readOnly
              value={this.state.channel.W_0M}
            />
          </Form.Field>)}
          {(this.state.channel.State === 'opened- waiting configuration' || this.state.channel.State === 'opened' || 
          this.state.channel.State === 'payment' || this.state.channel.State === 'send service'|| 
          this.state.channel.State === 'send proof') && (
            <Form>
            <Form.Field>
            <label>ethAddress</label>
            <Input
              readOnly
              value={this.state.channel.ethAddress}
            />
          </Form.Field> 

          <Form.Field>
            <label>Channel Smart Contract Balance</label>
            <Input
              label="wei"
              labelPosition="right"
              readOnly
              value={this.state.balance}
            />
          </Form.Field> 
          </Form>
          )}
          {(this.state.channel.State === 'opened' || this.state.channel.State === 'payment' || 
          this.state.channel.State === 'send service'|| this.state.channel.State === 'send proof') && (
          <Form>
          <Form.Field>
          <label>T<sub>EXP</sub></label>
            <Input
              readOnly
              value={this.state.T_EXP}
            />
          </Form.Field>
          <Form.Field>
            <label>Δ<sub>TD</sub></label>
            <Input
              readOnly
              value={this.state.Δ_TD}
            />
          </Form.Field>
          <Form.Field>
            <label>Δ<sub>TR</sub></label>
            <Input
              readOnly
              value={this.state.Δ_TR}
            />
          </Form.Field>
          </Form>
        )}
           {((this.state.channel.State === 'opened' && this.state.channel.messages) || this.state.channel.State === 'payment' || 
           this.state.channel.State === 'send service' || this.state.channel.State === 'send proof') && (
          <Form>
          <Form.Field>
            <label>W<sub>0C</sub></label>
            <Input
              readOnly
              value={this.state.channel.W_0C}
            />
          </Form.Field>
          
            <Form.Field>
              <label>m<sub>1</sub></label>
              <Input readOnly value={this.state.channel.messages.m1}/>
            </Form.Field>

            <Form.Field>
            <label>m<sub>2</sub></label>
            <Input readOnly value={this.state.channel.messages.m2}/>
            </Form.Field>
            <Form.Field>

            <label>m<sub>3</sub></label>
            <Input readOnly value={this.state.channel.messages.m3}/>
          </Form.Field>

            <Form.Field>
              <label>i</label>
              <Input readOnly value={this.state.channel.messages.i}/>
            </Form.Field>

            {(this.state.channel.merchant === this.state.accounts[0]) && (
              <Form.Field>
              <label>W_ic</label>
              <Input readOnly value={this.state.user_db[this.state.ID_userChannel]['W_ic']}/>
            </Form.Field>
            )}
          </Form>
            
          )}
          
          <Form>
          <Form.Field>
          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading} style={{"margin-bottom":20, "margin-top":20}}>
            Close
          </Button>
          </Form.Field>
          </Form>
        </Form>
      </div>
    );
  }
}


export default withRouter(ChannelShow);
