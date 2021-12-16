pragma solidity >=0.7.0 <0.9.0;

contract factoryChannel{
    mapping(address => address[]) public ownerChannels;
    address[] public channels;
    
    function createChannel(bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, uint256 _c, uint256 _v, uint256 _T_exp, uint256 _TD, uint256 _TR) public payable returns(address){
        require(msg.value == _c * _v, "msg.value error");
        
        address newChannel = address ((new channel){value: msg.value}(_W_jm, _W_jc, _S_id, _c, _v, _T_exp, _TD, _TR, msg.sender));
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
    uint256 j;
    address public costumer;

    //Channel parameters
    bytes32 public W_jm;
    bytes32 public W_jc; 
    string public S_id; //identificador del servei
    uint256 public c; //nombre de micromonedes
    uint256 public v; //valor de les micromonedes
    uint256 public T_exp; //Temps de caducitat
    uint256 public TD; //Període de deposit
    uint256 public TR; //Període de reembolsament
    uint256 public start; //Moment en que es defineixen els paràmetres del canal

    //Desplegament amb definició del propietari del canal i dels corresponents paràmetres
    constructor(bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, uint256 _c, uint256 _v, uint256 _T_exp, uint256 _TD, uint256 _TR, address _costumer) payable {
        costumer = _costumer;
        j = 0;
        
        W_jm = _W_jm;
        W_jc = _W_jc;
        S_id = _S_id;
        c = _c;
        v = _v;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
        start = block.timestamp;
    }
    
    //Funció per a transferir un determinat nombre de micromonedes del present smart contract a la wallet del venedor 
    //o fer la transferència a un nou canal. És a dir, protocols "liquidación de canal" i "transferencia de canal".
    function transferDeposit(bytes memory _W_km, bytes memory _W_kc, uint256 k, address newChannelAddress) public {
        
        //now < T_exp || T_exp < now < TD
        require ((block.timestamp < start + T_exp) || ((T_exp + TD > block.timestamp) && (block.timestamp > start + T_exp)), "Time error");
        
        require (k > j, "k <= j");
            
        uint256 balance;
        bytes32 hash_m = bytes32(_W_km);
        bytes32 hash_c = bytes32(_W_kc);
        uint256 i = k-j;
        
        for (i; i!= 0; i--){
            hash_m = sha256(abi.encodePacked (hash_m));
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
            payable(newChannelAddress).transfer(balance * (1 ether));
        }else{
            payable(msg.sender).transfer(balance*(1 ether));
        }
        
        j = k;
        W_jm = bytes32 (_W_km);
        W_jc = bytes32 (_W_kc);
    }
    
    //Funció per a tancar el canal i retorn del balaç que queda al propietari (selfdestruct de l'smart contract) 
    function channelClose() public onlyOwner{
        
        //T_exp + TD < now < T_exp + TD + TR
        require(((start + T_exp + TD < block.timestamp) && (block.timestamp < start + T_exp + TD + TR)));
            
        selfdestruct(payable(msg.sender));
    }
    
    function merchantChange(bytes32 _W_0m, string memory _S_id, uint256 _T_exp, uint256 _TD, uint256 _TR) public onlyOwner(){
        
        //T_exp + TD < now < T_exp + TD + TR
        require(((start + T_exp + TD < block.timestamp) && (block.timestamp < start + T_exp + TD + TR)));
        
        W_jm = _W_0m;
        S_id = _S_id;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
        start = block.timestamp; 
    }
    
    modifier onlyOwner(){
        require (msg.sender == costumer, "Only merchant of the delivery can set the channel params.");
        _;
    }
}
