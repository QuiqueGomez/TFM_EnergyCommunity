pragma solidity ^0.4.17;



/**
 * This contract is run by the Owner/central bank of the energy community (can be a retailer or a cooperative). 
 * It is prepared for the means of showing as prototype. It only works with a community of 3 users and 6 Smart Meters(community, 3 demands(users), 1 PV, 1 Battery)
 *
 */
contract EnergyCommunity {

	address owner; // it has the function of central bank of the community. It issues SCP tokens and distributes payments

	event NewUserCreated(address UserAddress, uint UserId);
	event UserRemoved(uint UserId);
	event NewSmartMeterCreated(uint SMId, bool Type);
	event AllSCPTokensSold();
	event LiquidationDone(address From, address to, uint Value);
	event PowerContractedPayment(uint PowerPayment, int Percentage1, int Percentage2, int Percentage3);
	
	event NewMeasurement(int Comm, int D1, int D2, int D3, int PV, int Batt);
	event NewMarketPrice(uint PoolPrice, uint AccessTariff, uint NetworkFee);

	
	struct MarketPrice{
    	uint poolPrice; // price will be in €/kWh
    	uint accessTariff;
    	uint networkFee;
	}
	MarketPrice[] public marketPrices; //array containing all Market prices in time

	struct User {
		address addr;
		uint id;
		int balanceInstantaneo; // Internal balance of money that each user owes or is owed (<0 he owes; >0 he is owed)
		int powerPercentage; // % of power contracted 
	}

	User[] public users; //array containing users

	struct SmartMeter{ 
		uint id;
		bool typeOfSmartMeter; // true for generation & battery (self consumption technologies), false for demand. There should be one for the community ->true
	    int [] measurement; // array that holds the historic of measurements of this smart meter in Watios
	}

	
	mapping (uint => uint) public userPositionToSmartMeterId;
    mapping (uint => SmartMeter) public idToSmartMeter; // 
	mapping (address => uint) public balanceSCP; //Self Consumption Participation tokens balance. 
	mapping (address => uint)  public balanceEC; //Energy Community coins balance. (utility token)
	mapping (address => mapping (address => uint)) public allowance;
	
    uint public decimals = 10**10; // in solidity we cannot use float numbers. We will multiply by a big number and return it to float in the javascript(frontend)
	uint public numberOfUsers = 0;
	uint public numberOfSmartMeters  =0;
	uint public numberOfSCPTokens = 0;
	uint public numberOfSCPTokensRemaining = 0; //that have not been bought yet from the Owner/central bank
	uint public priceOfECCoins;
	uint public priceOfSCPTokens; //En ECCOins
	address public DSO; // Address of the Distribution System Operator that sells and buys energy from the community. To be filled in in the web app
	int public balanceInstantaneoDSO = 0; // internal balance of the DSO
	uint public euroToWei = 10**15; // I consider that 1 ether is equal to 1000€. 1 ether= 10^18 wei
	
	uint public powerContracted = (46*decimals/10); //in kW*10^10. initial value
	uint public powerContractedOld = 10*decimals;
	uint public initialPercentPowerUser1 = 69; //over 1000 to create one decimal afterwards
	uint public initialPercentPowerUser2 = 513;
	uint public initialPercentPowerUser3 = 417;

	uint public maxPowerInOrOut; //to account for the maximum power going through the smartmeter of the community
	uint public counterHours = 0;
	uint public priceOfPowerContractedPerHour = 48333000; // in €^10/kWh. Initial value
	uint  public buyingPrice;
	uint public sellingPrice;
	uint public totalDemand;
	int [] public balanceInstantaneo1Array;
	int [] public balanceInstantaneo2Array;
	int [] public balanceInstantaneo3Array;
	int [] public balanceInstantaneoDSOArray;
	int public economicTransaction1;
	int public economicTransaction2;
	int public economicTransaction3;
	int public economicTransactionDSO;
	int [] public economicTransaction1Array;
	int [] public economicTransaction2Array;
	int [] public economicTransaction3Array;
	int [] public economicTransactionDSOArray;






    //CONSTRUCTOR   
	function EnergyCommunity (uint _initialPrice, uint _initialSupply) public{
		owner = msg.sender;
		balanceEC[msg.sender] = _initialSupply *decimals; // EC*10e10
		priceOfECCoins = _initialPrice; //in wei
	
	}	



	modifier onlyOwner() {
	    require(msg.sender == owner);
	    _;
	}

/**
*****************FROM HERE ON FUNCTIONS TO SET UP THE COMMUNITY ************************ 
*/
// First insert user, then its smartmeter
	function addNewSmartMeter(uint _id, bool _type, uint idUserAttachedTo) public onlyOwner{ // First insert the community SM, then the user ones and then generation/battery. If _type is true we dont care about idUserAttachedTo
	    bool aux = false;	    
	    
		idToSmartMeter[_id].id = _id;
		idToSmartMeter[_id].typeOfSmartMeter = _type;
		NewSmartMeterCreated(_id, _type);
		numberOfSmartMeters ++;
		
		if(_type == false){ // if we are inserting a user smart meter 
    		for(uint i=0; i<users.length; i++){
    		    if(idUserAttachedTo == users[i].id){
    		        userPositionToSmartMeterId[i] = _id; // we link the user to its smart meter
    		        aux = true;
    		        break;
    		    }
    		}
    		if (aux == false) revert(); //If it is not found the smart meter cannot be added. First add the user and then its smartmeter.
		}
	}

	function addNewUser(address _addr, uint _id) public onlyOwner{
		users.push(User(_addr,_id,0,0));
		NewUserCreated(_addr,_id);

		numberOfUsers ++;
	}

	function setContractedPower(uint _powerContracted, uint _priceOfPowerContractedPerHour) public onlyOwner{
		powerContracted = _powerContracted; // in kW *decimals
		priceOfPowerContractedPerHour = _priceOfPowerContractedPerHour; // in €*decimals
	}

	function removeUser (uint _id) public onlyOwner{
		uint index=10000; //random big number
		
		for(uint i=0; i < users.length; i++){
			if(users[i].id == _id){
				index = i;
				break;
			}
		}
		if (index == 10000){ // if id introduce was not found, exit
		    revert();
		}
	
        delete users[index];
        delete userPositionToSmartMeterId[index];
        numberOfUsers--;
        UserRemoved(_id);
	}
    
    function defineDSO(address _addr) public onlyOwner{
    	DSO = _addr;
    }

    function removeSmartMeter (uint _id) public onlyOwner{
        delete idToSmartMeter[_id];
        numberOfSmartMeters --;
    }

/**
*****************FROM HERE ON FUNCTIONS RELATED TO TOKENS OF THE COMMUNITY************************ 
*/

	function setPriceOfECCoins(uint _newPriceOfEC) public onlyOwner{
		priceOfECCoins = _newPriceOfEC; //price of EC in wei (1 ether is 1000€) 10e15

	}


	function buyECCcoins (uint _numberOfCoinsToBuy) public payable{
		require(_numberOfCoinsToBuy * priceOfECCoins == msg.value); // money payed to the contract is correct
		require((_numberOfCoinsToBuy*decimals) < balanceEC[owner]); // Still enough tokens to sell

		balanceEC[owner] -= _numberOfCoinsToBuy*decimals;
		balanceEC[msg.sender] += _numberOfCoinsToBuy*decimals;
	}



	function mintSCPTokens (uint _tokensMinted, uint _pricePerToken) public onlyOwner{
		balanceSCP[owner] += _tokensMinted;
		numberOfSCPTokens += _tokensMinted;
		numberOfSCPTokensRemaining += _tokensMinted;
		priceOfSCPTokens = _pricePerToken; //in EC*10e10
	}

	function buySCPTokens (uint _numberOfTokensToBuy) public{ //SCP tokens are bought with EC coins
		require(balanceSCP[owner]>=_numberOfTokensToBuy); // Still enough tokens to sell
		require(balanceEC[msg.sender] >= _numberOfTokensToBuy * priceOfSCPTokens); // enough EC coins in his account

		balanceEC[msg.sender] -= _numberOfTokensToBuy * priceOfSCPTokens;
		balanceEC[owner] += _numberOfTokensToBuy * priceOfSCPTokens;
		balanceSCP[owner] -= _numberOfTokensToBuy;
		balanceSCP[msg.sender] += _numberOfTokensToBuy;
		numberOfSCPTokensRemaining = balanceSCP[owner];
		if(balanceSCP[owner] == 0){
			AllSCPTokensSold();
		}
	}
	
    function burnSCPTokens (uint _tokensBurned) public onlyOwner{
        balanceSCP[owner] -= _tokensBurned;
        numberOfSCPTokens -= _tokensBurned;
        numberOfSCPTokensRemaining = balanceSCP[owner];
    }

    function burnECCOins (uint _coinsBurned) public onlyOwner{
        balanceEC[owner] -=_coinsBurned*decimals;
        
    }

	function buySCPTokensFromOtherUser(address _fromWho, uint _numberOfTokensToBuy) public{
		require(_numberOfTokensToBuy <= allowance[_fromWho][msg.sender]); // less than what the other user allowed
		require(balanceEC[msg.sender] >= _numberOfTokensToBuy * priceOfSCPTokens); // enough EC coins in the buyer's account

        allowance[_fromWho][msg.sender] -= _numberOfTokensToBuy;
		balanceEC[msg.sender] -= _numberOfTokensToBuy * priceOfSCPTokens;
		balanceEC[_fromWho] += _numberOfTokensToBuy * priceOfSCPTokens;
		balanceSCP[_fromWho] -= _numberOfTokensToBuy;
		balanceSCP[msg.sender] += _numberOfTokensToBuy;
		
	}

	function givePermission(address _permissionTo, uint _SCPQuantity) public{
		require(_SCPQuantity <= balanceSCP[msg.sender]);
		allowance[msg.sender][_permissionTo] = _SCPQuantity;
	}
	
	function withdraw() external onlyOwner {
	    owner.transfer(this.balance); //withdraw money from the smart contract that will contain ethers that users used to pay for EC
	}


		/**
	********************************FROM HERE ON GETTER FUNCTIONS**********************
	*/
	function getMyBalanceEC() public view returns(uint){
		return balanceEC[msg.sender]/decimals;
	}

	function getMyBalanceSCP() public view returns(uint){
		return balanceSCP[msg.sender];
	}
	function getMybalanceInstantaneo() public view returns (int){
		uint pos = 10000;
        for(uint i=0; i< users.length; i++){
            if(users[i].addr == msg.sender){
                pos = i;
                break;
            }
        }
        if (pos == 10000){
            revert();
        }
        return users[pos].balanceInstantaneo;
	}
    function getMyMeasurements() public view returns(int[]){
        uint pos = 10000;
        for(uint i=0; i< users.length; i++){
            if(users[i].addr == msg.sender){
                pos = i;
                break;
            }
        }
        if (pos == 10000){
            revert();
        }
        return idToSmartMeter[userPositionToSmartMeterId[pos]].measurement;
    }

    function getMeasurementsOfASmartMeter (uint _id) public view returns (int[]){ 
        if(idToSmartMeter[_id].typeOfSmartMeter == true){ //Any user can see measurments coming from PV, Battery and the community SM
            return idToSmartMeter[_id].measurement;
        }
        if (msg.sender == owner){
            return idToSmartMeter[_id].measurement; // the owner can access the measurements of anyone
        }
    }

    function getMyInstaneousBalance(uint _idUser) public view returns(int[]){
        if (users[_idUser-1].addr == msg.sender){
        	if(_idUser == 1){
        		return balanceInstantaneo1Array;
        	}else if(_idUser == 2){
        	    return balanceInstantaneo2Array;
        	}else if(_idUser == 3){
        		return balanceInstantaneo3Array;
        	}
    	}else if (msg.sender == owner){
            if(_idUser == 1){
        		return balanceInstantaneo1Array;
        	}else if(_idUser == 2){
        	    return balanceInstantaneo2Array;
        	}else if(_idUser == 3){
        		return balanceInstantaneo3Array;
        	}
        }else{
        	revert();
        }
    }
    
    function getDSOInstataneousBalance() public view returns(int[]){
    	return balanceInstantaneoDSOArray;
    }

    function getMyEconomicTransactions(uint _idUser) public view returns(int[]){
        if (users[_idUser-1].addr == msg.sender){
        	if(_idUser == 1){
        		return economicTransaction1Array;
        	}else if(_idUser == 2){
        	    return economicTransaction2Array;
        	}else if(_idUser == 3){
        		return economicTransaction3Array;
        	}
    	}else if (msg.sender == owner){
            if(_idUser == 1){
        		return economicTransaction1Array;
        	}else if(_idUser == 2){
        	    return economicTransaction2Array;
        	}else if(_idUser == 3){
        		return economicTransaction3Array;
        	}
        }else{
        	revert();
        }
    }
    
    function getDSOEconomicTransaction() public view returns(int[]){
    	return economicTransactionDSOArray;
    }



/**
********************************** From here on, measurement registration functions  ****************************************************
*/

    function abs(int _value) pure internal returns (int){
        if(_value >=0){
            return _value;
        }else{
            return -_value;
        }
    }

    // all energy measurement are entering in kW*decimals
	function newMeasurement(int _comm, int _d1, int _d2, int _d3, int _pv, int _batt, uint _poolPrice, uint _accessTariff, uint _networkFee) public {
	    
		
		
		int  moneyOutOrIn; // positive -> money out; negative -> money in 
		uint communitySavings;

		//register measurements and prices
        marketPrices.push(MarketPrice(_poolPrice, _accessTariff, _networkFee));
    	idToSmartMeter[0].measurement.push(_comm); //positive -> energy entering; negative -> energy exiting
		idToSmartMeter[1].measurement.push(_d1);
		idToSmartMeter[2].measurement.push(_d2);
		idToSmartMeter[3].measurement.push(_d3);
		idToSmartMeter[4].measurement.push(_pv);
		idToSmartMeter[5].measurement.push(_batt); //positve -> discharging; negative -> charging

		NewMeasurement( _comm, _d1, _d2, _d3, _pv, _batt);
		NewMarketPrice(_poolPrice, _accessTariff, _networkFee);

		//Calculations of financials derived from measurements and prices
        totalDemand = uint(_d1 + _d2 + _d3);
		buyingPrice = (_poolPrice + _accessTariff + _networkFee); // en €*10^10/kW
		sellingPrice = (_poolPrice - _networkFee);
	

		if(_comm > 0){ //energy entering the comm
			moneyOutOrIn = (_comm * int(buyingPrice))/int(decimals); //We erase one of the decimals(10^10) since we are multiplying 2 quantities that have decimals
			if(totalDemand < uint(_comm)){
				communitySavings = 0;
			}else{ // there is being some generation inside the community
				communitySavings = (totalDemand - uint(_comm)) * buyingPrice/decimals;
			}
		}else if(_comm == 0){ 
			moneyOutOrIn = 0;
			communitySavings = (totalDemand * buyingPrice)/decimals;

		}else{//energy exiting
			moneyOutOrIn = (_comm * int(sellingPrice))/int(decimals);
			communitySavings = (totalDemand * buyingPrice)/decimals + uint(-moneyOutOrIn); //minus before moneyOutOrIn to have a positive number
		
		}
		
		//Update internal balances of all users and DSO in EC
		economicTransaction1 = (_d1 * int(buyingPrice)/int(decimals)- int(communitySavings * balanceSCP[users[0].addr]/numberOfSCPTokens))*int(euroToWei)/int(priceOfECCoins); // save in EC *10^10
		economicTransaction2 = (_d2 * int(buyingPrice)/int(decimals)- int(communitySavings * balanceSCP[users[1].addr]/numberOfSCPTokens))*int(euroToWei)/int(priceOfECCoins);
		economicTransaction3 = (_d3 * int(buyingPrice)/int(decimals)- int(communitySavings * balanceSCP[users[2].addr]/numberOfSCPTokens))*int(euroToWei)/int(priceOfECCoins);
		economicTransactionDSO = moneyOutOrIn*int(euroToWei)/int(priceOfECCoins);
		users[0].balanceInstantaneo += economicTransaction1;
		users[1].balanceInstantaneo += economicTransaction2;
		users[2].balanceInstantaneo += economicTransaction3;
		balanceInstantaneoDSO += economicTransactionDSO;
		// update to arrays for storage and post plotting
		economicTransaction1Array.push(economicTransaction1);
		economicTransaction2Array.push(economicTransaction2);
		economicTransaction3Array.push(economicTransaction3);
		economicTransactionDSOArray.push(economicTransactionDSO);
		balanceInstantaneo1Array.push(users[0].balanceInstantaneo);
		balanceInstantaneo2Array.push(users[1].balanceInstantaneo);
		balanceInstantaneo3Array.push(users[2].balanceInstantaneo);
		balanceInstantaneoDSOArray.push(balanceInstantaneoDSO);

		//add one to the number of hours for after liquidation of contracted powrers
	    counterHours ++;
	}



/**
**************************************LIQUIDATIONS*****************************************
*/


	function transactionECCOins (address _from, address _to, uint _value) internal{
		require(balanceEC[_from] >= (_value));
		balanceEC[_from] -= _value;
		balanceEC[_to] += _value;
		LiquidationDone(_from, _to, _value);
	}

	function liquidationOfTransactions () public {
	    uint powerContractedFee;
		if(balanceInstantaneoDSO>0){
			
			transactionECCOins(owner,DSO, uint(balanceInstantaneoDSO)); //We pass value in EC*decimals
		}else{
			
			transactionECCOins(DSO,owner, uint(-balanceInstantaneoDSO));
		}
		balanceInstantaneoDSO = 0; //Reinitialize the count for balanceinsnataneo
		for(uint i=0; i<users.length; i++){
		    
	        if(users[i].balanceInstantaneo>0){
			    transactionECCOins(users[i].addr,owner, uint(users[i].balanceInstantaneo));
			}else{
				transactionECCOins(owner,users[i].addr, uint(-users[i].balanceInstantaneo));
			}
			users[i].balanceInstantaneo = 0; //Reinitialize count for user internal balance
		}

		//Power payment from owner/central bank to DSO for the contracted power of the community
	    balanceEC[owner] -= powerContracted*priceOfPowerContractedPerHour/decimals *counterHours* euroToWei/priceOfECCoins;
	    balanceEC[DSO] += powerContracted*priceOfPowerContractedPerHour/decimals *counterHours* euroToWei/priceOfECCoins;
	    
	    //each user pays depending on their contribution percentage to the Owner:
	    users[0].powerPercentage = (int(initialPercentPowerUser1*powerContractedOld/1000)-int((powerContractedOld - powerContracted)*balanceSCP[users[0].addr]/numberOfSCPTokens))*1000/int(powerContracted);
	    users[1].powerPercentage = (int(initialPercentPowerUser2*powerContractedOld/1000)-int((powerContractedOld - powerContracted)*balanceSCP[users[1].addr]/numberOfSCPTokens))*1000/int(powerContracted);
	    users[2].powerPercentage = (int(initialPercentPowerUser3*powerContractedOld/1000)-int((powerContractedOld - powerContracted)*balanceSCP[users[2].addr]/numberOfSCPTokens))*1000/int(powerContracted);
	    
	    for(uint j=0; j<users.length; j++){
		    if(users[j].powerPercentage > 0){//if they pay
		        powerContractedFee = powerContracted*priceOfPowerContractedPerHour/decimals *counterHours* uint(users[j].powerPercentage)/1000 * euroToWei/priceOfECCoins;
		        balanceEC[users[j].addr] -= powerContractedFee;
		        balanceEC[owner] += powerContractedFee;
		    }else{ // if negative they get an incentive for it
		        powerContractedFee = powerContracted*priceOfPowerContractedPerHour/decimals *counterHours* uint(-users[j].powerPercentage)/1000 * euroToWei/priceOfECCoins;
			    balanceEC[owner] -= powerContractedFee;
			    balanceEC[users[j].addr] += powerContractedFee;
		    }
		}
		
		PowerContractedPayment(powerContracted*priceOfPowerContractedPerHour/decimals *counterHours* euroToWei/priceOfECCoins, users[0].powerPercentage, users[1].powerPercentage, users[2].powerPercentage);
		counterHours = 0; //initialize counter of hours for max power measurements
		maxPowerInOrOut =0;
		
	}
}
