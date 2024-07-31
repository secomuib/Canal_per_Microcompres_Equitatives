pragma solidity >0.4.23 <0.9.0;

contract factoryChannel {
    mapping(address => address[]) public ownerChannels;
    address[] public channels;
    
    address immutable newChannel;

    constructor() {
        newChannel = address(new channel());
    }

    function createChannel( uint256 _c, uint256 _v) public payable returns(address payable){
        //Clone of a new channel
        address channelClone = createClone(newChannel);
        address payable channelAddr = payable (address(channelClone));
        channel ch = channel(channelAddr);
        //Initialize the new channel without setting the parameters
        ch.initialize{value: msg.value}(_c,_v, msg.sender);
        //Store address of the new channel
        channels.push(channelClone);
        //Store owner address of the channel
        ownerChannels[msg.sender].push(channelClone);
        return channelAddr;
    }

    function createChannel( uint256 _c, uint256 _v, bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, uint256 _T_exp, 
        uint256 _TD, uint256 _TR, address _merchant) public payable returns(address payable){
        //Clone of a new channel
        address channelClone = createClone(newChannel);
        address payable channelAddr = payable (address(channelClone));
        channel ch = channel(channelAddr);
        //Initialize the channel setting all the parameters
        ch.initialize{value: msg.value}(_c,_v, msg.sender, _merchant, _W_jm, _W_jc, _S_id, _T_exp, _TD, _TR);
        //Store address of the new channel
        channels.push(channelClone);
        //Store owner address of the channel
        ownerChannels[msg.sender].push(channelClone);
        return channelAddr;
    }

    
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
        let clone := mload(0x40)
        mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
        mstore(add(clone, 0x14), targetBytes)
        mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
        result := create(0, clone, 0x37)
        }
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

    //Channel variables definition
    uint256 public j;
    address public customer;
    address public merchant;

    //Channel parameters
    bytes32 public W_jm; //Hash of the last microcoin used by the user merchant
    bytes32 public W_jc; //Hash of the last microcoin used by the user merchant that the user customer has sent to him
    string public S_id; //Service identifier
    uint256 public c; //Microcoins number
    uint256 public v; //Microcoins value
    uint256 public T_exp; //Expiration time
    uint256 public TD; //Deposit period
    uint256 public TR; //Refund period

    bool public isBase; 

    constructor(){
        //To ensure that the base contract cannot be initialized
        isBase = true;
    }

    function initialize(uint256 _c, uint256 _v, address _customer) external payable{
        //isBase param to ensure that the base contract cannot be initialized more than once
        require(isBase == false);

        //Storage of the channel variables
        customer = _customer; //Customer address
        c = _c; //Number of coins
        v = _v; //Value of one coin

        if(msg.value != 0){
            //Value send must be correct
            require(msg.value == _c*_v, 'balance error');
        }
    }

    function initialize(uint256 _c, uint256 _v, address _customer, address _merchant, bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, 
    uint256 _T_exp, uint256 _TD, uint256 _TR) external payable{
        //isBase param to ensure that the base contract cannot be initialized more than once
        require(isBase == false);
        //Value send must be correct
        require(msg.value == _c*_v, 'balance error');
        //Deadlines verification
        require((T_exp == 0 && TD == 0 && TR == 0 && (T_exp + TD) < block.timestamp) || ((T_exp + TD) < block.timestamp 
        && (block.timestamp < (T_exp + TD + TR))));
        
        //Storage of the channel variables
        customer = _customer; //Customer address
        merchant = _merchant; //Merchant address
        c = _c; //Number of coins
        v = _v; //Value of one coin

        j = 0;
        
        W_jm = _W_jm;
        W_jc = _W_jc;
        S_id = _S_id;
        c = _c;
        v = _v;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
    }
    
    //Configuration channel params function
    function setChannelParams(address _merchant, bytes32 _W_jm, bytes32 _W_jc, string memory _S_id, uint256 _c, uint256 _v, uint256 _T_exp, uint256 _TD, uint256 _TR) public onlyOwner {
        require(address(this).balance == _c * _v);
        require((T_exp == 0 && TD == 0 && TR == 0 && (T_exp + TD) < block.timestamp) || ((T_exp + TD) < block.timestamp && (block.timestamp < (T_exp + TD + TR))));
        merchant = _merchant;
        
        j = 0;
        
        W_jm = _W_jm;
        W_jc = _W_jc;
        S_id = _S_id;
        c = _c;
        v = _v;
        T_exp = _T_exp;
        TD = _TD;
        TR = _TR;
    }

    //Function for transfer a determied number of microcoins from this SC to the merchant wallet ("Channel redeem"), 
    //or, to transfer the microcoins to a new channel ("Chanel transference").
    function transferDeposit(bytes memory _W_km, bytes memory _W_kc, uint256 k, address newChannelAddress) public {
        //Channel transfer only available for merchant user
        require(msg.sender == merchant, "Caller address doesn't correspond to merchant address set");
        //Deadline verification
        require (block.timestamp < (T_exp + TD), "Time error"  );
        //Check index (k) send higher than previous index used
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
            j = k;
            
            W_jm = bytes32 (_W_km);
            W_jc = bytes32 (_W_kc);
        }else{
            balance = ((k-j-1)/2);
            j = k-1;
            bytes32 hash_m = bytes32(_W_km);
            bytes32 hash_c = bytes32(_W_kc);
            uint256 i = k-j;
        
            for (i; i!= 0; i--){
                hash_m = sha256(abi.encodePacked(hash_m));
                hash_c = sha256(abi.encodePacked(hash_c)); 
            }
             
            j = k-1;
            W_jm = bytes32 (hash_m);
            W_jc = bytes32 (hash_c);
        }
        
        if(newChannelAddress != 0x0000000000000000000000000000000000000000){
            payable(newChannelAddress).call{value: balance*v}("");
        }else{
            payable(msg.sender).transfer(balance*v);
        }

        //Update params: 
        //c = c - balance;
        
    }
    
    //Function to close the channel and return the balance stored to the channel owner (customer), also it's made the selfdestruct of the smart contract
    function channelClose(address refundAddress) public payable onlyOwner{
        //T_exp + TD < now < T_exp + TD + TR
        require((T_exp + TD < block.timestamp), "Time error");

        selfdestruct(payable(refundAddress));
    }
    
    
     // Function to receive Ether, msg.data must be empty
    receive() external payable {
        
    }

    // Fallback function is called when msg.data is not empty
    fallback() external payable {
        
    }

    modifier onlyOwner(){
        require (msg.sender == customer, "Only customer of the delivery can set the channel params.");
        _;
    }
}