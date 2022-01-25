pragma solidity >=0.7.0 <0.9.0;

contract factoryChannel{
    mapping(address => address[]) public ownerChannels;
    address[] public channels;
    
    function createChannel( uint256 _c, uint256 _v) public payable returns(address){
        address newChannel = address((new channel){value: msg.value}(_c, _v, msg.sender));
        channels.push(newChannel);
        ownerChannels[msg.sender].push(newChannel);
        return newChannel;
    }

    function getChannels(uint index) public view returns(address){
        return channels[index];
    }

    function getChannelsCount() public view returns(uint count){
        return channels.length;
    }

    function getOwnerChannels(address _owner) public view returns (address[] memory){
        return ownerChannels[_owner];
    }
    
    function getOwnerChannelsCount(address _owner) public view returns (uint){
        return ownerChannels[_owner].length;
    }
}

contract channel{
    uint256 public j;
    address public customer;

    //Channel parameters
    bytes32 public W_jm;
    bytes32 public W_jc; 
    string public S_id; //Service identifier
    uint256 public c; //Microcoins number
    uint256 public v; //Microcoins value
    uint256 public T_exp; //Expiration time
    uint256 public TD; //Deposit period
    uint256 public TR; //Refund period
    //uint256 public start; 

    constructor(uint256 _c, uint256 _v, address _customer) payable {
        customer = _customer;
        c = _c;
        v = _v;

        if(msg.value != 0){
            require(msg.value == _c*_v);
        }
    }
    
    //Configuration channel params function
    function setChannelParams(bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, uint256 _c, uint256 _v, uint256 _T_exp, uint256 _TD, uint256 _TR) public onlyOwner {
        require(address(this).balance == _c * _v);
        j = 0;
        
        W_jm = _W_jm;
        W_jc = _W_jc;
        S_id = _S_id;
        c = _c;
        v = _v;
        //start = block.timestamp;
        //T_exp = start + _T_exp;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
    }
    
    /*function blocktimestamp() public returns(uint256){
        return block.timestamp;
    }*/

    //Function for transfer a determied number of microcoins from this SC to the merchant wallet ("Channel liquidation"), 
    //or, to transfer the microcoins to a new channel ("Chanel transference").
    function transferDeposit(bytes memory _W_km, bytes memory _W_kc, uint256 k, address newChannelAddress) public {
        
        require ( block.timestamp < (T_exp + TD) , "Time error");
        
        require (k > j, "k <= j");
            
        uint256 balance;
        bytes32 hash_m = bytes32(_W_km);
        bytes32 hash_c = bytes32(_W_kc);
        uint256 i = k-j;
        
        for (i; i!= 0; i--){
            hash_m = sha256(abi.encodePacked(hash_m));
            hash_c = sha256(abi.encodePacked(hash_c)); 
        }

        require (W_jm == hash_m, "W_km is incorrect");
        require (W_jc == hash_c, "W_kc is incorrect");
        
        if(k%2 == 0){
            balance = ((k-j)/2);
        }else{
            balance = ((k-j-1)/2);
        }
        
        if(newChannelAddress != 0x0000000000000000000000000000000000000000){
           
            payable(newChannelAddress).call{value: balance*v}("");
        }else{
            payable(msg.sender).transfer(balance*v /* *(1 ether)*/);
        }

        //Update params: 
        c = c - balance;
        
        j = k;
        W_jm = bytes32 (_W_km);
        W_jc = bytes32 (_W_kc);
    }
    
    //Funció per a tancar el canal i retorn del balaç que queda al propietari (selfdestruct de l'smart contract) 
    function channelClose() public payable onlyOwner{
        
        //T_exp + TD < now < T_exp + TD + TR
        require(((T_exp + TD < block.timestamp) /*&& (block.timestamp < T_exp + TD + TR)*/));
        selfdestruct(payable(msg.sender));
    }
    
    /*function merchantChange(bytes32 _W_0m, string memory _S_id, uint256 _T_exp, uint256 _TD, uint256 _TR) public onlyOwner(){
        
        //T_exp + TD < now < T_exp + TD + TR
        require(((T_exp + TD < block.timestamp) && (block.timestamp < T_exp + TD + TR)));
        
        W_jm = _W_0m;
        S_id = _S_id;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
        start = block.timestamp; 
    }*/
    
     // Function to receive Ether. msg.data must be empty
    receive() external payable {
        c = address(this).balance;
    }

    // Fallback function is called when msg.data is not empty
    fallback() external payable {
        c = address(this).balance;
    }


    modifier onlyOwner(){
        require (msg.sender == customer, "Only customer of the delivery can set the channel params.");
        _;
    }
}
