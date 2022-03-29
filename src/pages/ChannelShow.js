import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';

import channelSC from '../ethereum/channel';

const ecies = require('ecies-geth');

class ChannelShow extends Component {
  state = {
    channel:'',
    accounts: '',
    T_EXP: '',
    Δ_TD: '',
    Δ_TR: '',
    ID_userChannel: '',
    m1_dec: '',
    m2_dec: '',
    m3_dec: '',
    balance: '',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let id = this.props.match.params.id;

      //Request the channel DB information
      await fetch('http://localhost:7000/channels/'+id, {
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
      
      //In case the channel is opened and already has an ethereum address, consult some more information that also will be provided to the user
      if(this.state.channel.ethAddress){
        let T_EXP, Δ_TD, Δ_TR;
        //In case the channel isn't closed, can obtain the parameters from the SC. 
        if(this.state.channel.State != "closed"){
          //Obtain the SC of the channel
          let channelContract = channelSC(this.state.channel.ethAddress)

          //Request the timeout parameters T_EXP, TD and TR
          T_EXP = await channelContract.methods.T_exp().call();
          Δ_TD = await channelContract.methods.TD().call();
          Δ_TR = await channelContract.methods.TR().call();
        }

        //Reformat the timeout parameters to date format
        let T_EXP_format = new Date(T_EXP*1000);
        let Δ_TD_format = new Date((parseInt(T_EXP,10) + parseInt(Δ_TD,10))*1000);
        let Δ_TR_format = new Date((parseInt(T_EXP,10) + parseInt(Δ_TD,10) + parseInt(Δ_TR,10))*1000);
        
        //Request the user channel DB information
        await fetch('http://localhost:7000/' + accounts[0], {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          }
        }).then(res => {
              return res.json();
          }).then(data => {
              this.setState({
                  user_db: data,
              })
          });
        
        //Define some useful variables
        let ID_userChannel, M1_dec, M2_dec, M3_dec;
        
        //Obtain the ID of the user channel DB that has the channel object
        this.state.user_db.map((info, index)=>{
          if(parseInt(id, 10) === parseInt(this.state.user_db[index]['channelID'],10)){
              ID_userChannel = index;
              console.log('ID_userChannel ', ID_userChannel);
          }
        });

        console.log(this.state.channel['merchant'])
        console.log(this.state.channel['messages'] )
        console.log(this.state.channel.State)
        //In case the user connected is the merchant, the users has exchanged some messages and the channel is not closed 
        //Obtain the merchant privateKey from their DB and decrypt the m1 and m3 messages. 
        if(accounts[0] == this.state.channel['merchant'] && this.state.channel['messages'] && this.state.channel.State != "closed"){
          let M_Private_Key = this.state.user_db[ID_userChannel]['Private Key'];
          
          M_Private_Key = Buffer.from(M_Private_Key, 'hex');

          M1_dec = await ecies.decrypt(M_Private_Key, Buffer.from(this.state.channel['messages']['m1'], 'hex'));
          M1_dec = M1_dec.toString();

          if(this.state.channel['messages']['m3']){
            M3_dec = await ecies.decrypt(M_Private_Key, Buffer.from(this.state.channel['messages']['m3'], 'hex'));
            M3_dec = M3_dec.toString();
          }
          
        }
        //in case the usert connected is the customer and the users has exchanged some messages, obtain the customer private key and 
        //decrypt the m2 message.
        else if(accounts[0] === this.state.channel['customer'] && this.state.channel['messages']){
          if(this.state.channel['messages']['m2']){
            let C_Private_Key = this.state.user_db[ID_userChannel]['Private Key'];
            C_Private_Key = Buffer.from(C_Private_Key, 'hex');

            M2_dec = await ecies.decrypt(C_Private_Key, Buffer.from(this.state.channel['messages']['m2'], 'hex'));
            M2_dec = M2_dec.toString();
          }
        }
        this.setState({
          T_EXP: T_EXP_format,
          Δ_TD: Δ_TD_format,
          Δ_TR: Δ_TR_format,
          m1_dec: M1_dec,
          m2_dec: M2_dec,
          m3_dec: M3_dec,
          accounts: accounts,
          ID_userChannel: ID_userChannel
        });
      }
      
      let balance;

      //In case the channel isn't closed, check the channel smart contract balance
      if(this.state.channel.State != "closed" && this.state.channel.ethAddress){
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
    }
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
        this.state.channel.State === 'send service'|| this.state.channel.State === 'send proof' || this.state.channel.State === 'Reused') && (
        <Form.Field>
            <label>W<sub>0M</sub></label>
            <Input
              readOnly
              value={this.state.channel.W_0M}
            />
          </Form.Field>)}
          {(this.state.channel.State === 'opened- waiting configuration' || this.state.channel.State === 'opened' || 
          this.state.channel.State === 'payment' || this.state.channel.State === 'send service'|| 
          this.state.channel.State === 'send proof' || this.state.channel.State === 'Reused') && (
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
          this.state.channel.State === 'send service'|| this.state.channel.State === 'send proof' || this.state.channel.State === 'send proof') && (
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
           this.state.channel.State === 'send service' || this.state.channel.State === 'send proof' || this.state.channel.State === 'Reused') && (
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
              <label>m<sub>1</sub> decrypted</label>
              <Input readOnly value={this.state.m1_dec}/>
            </Form.Field>

            <Form.Field>
            <label>m<sub>2</sub></label>
            <Input readOnly value={this.state.channel.messages.m2}/>
            </Form.Field>
            <Form.Field>

            <Form.Field>
              <label>m<sub>2</sub> decrypted</label>
              <Input readOnly value={this.state.m2_dec}/>
            </Form.Field>

            <label>m<sub>3</sub></label>
            <Input readOnly value={this.state.channel.messages.m3}/>
          </Form.Field>

          <Form.Field>
          <label>m<sub>3</sub> decrypted</label>
            <Input readOnly value={this.state.m3_dec}/>
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

            {(this.state.channel.State === 'Reused') && (
              <Form.Field>
              <label>ID new channel</label>
              <Input readOnly value={this.state.channel.newDBEntryID}/>
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
