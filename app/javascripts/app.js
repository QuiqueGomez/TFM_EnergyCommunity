// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
import Chart from 'chart.js';

// Import our contract artifacts and turn them into usable abstractions.

import energycommunity_artifacts from '../../build/contracts/EnergyCommunity.json'

// EnergyCommunity is our usable abstraction, which we'll use through the code below.

var EnergyCommunity = contract(energycommunity_artifacts);



var euroToWei = Math.pow(10,15);
var decimals = Math.pow(10,10);
var accounts;
var account;
var lengthOfUsers;
var ownerOrUser = 0;
var hourCounter = 0;
var hourNonReset = 0;
var myVar;



var timeStep = 20000; // in milliseconds



window.App = {


  

  start: function() {
    var self = this;

    // Bootstrap the EnergyCommunity abstraction for Use.
    EnergyCommunity.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }
      alert(accs.length);
      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];




      self.refreshBalanceEC();
      self.refreshBalanceSCP();
      self.refreshNumberOfSCPTokens();
      self.refreshPrices();
      self.refreshNumberOfUsers();
      self.refreshNumberOfSmartMeters();
      self.refreshBalanceInstantaneo();
      self.refreshBalanceInstantaneoDSO();
      self.refreshPowerContracted();
      self.refreshHour();
    });
  },

  startSimulation:function(){
    myVar = setInterval(App.excelSheet, timeStep);
  },

  stopSimulation:function(){
    window.clearInterval(myVar);
  },

  resetSimulation:function(){
    window.clearInterval(myVar);
    var hourCounter = localStorage.getItem("hourCounter");
    var hourNonReset = localStorage.getItem("hourNonReset");
  
    hourNonReset = Number(hourNonReset) + Number(hourCounter);
    hourCounter = 0;
   
    localStorage.setItem("hourCounter", hourCounter);
    localStorage.setItem("hourNonReset", hourNonReset);



  },
  excelSheet: function(){
    var hourCounter = localStorage.getItem("hourCounter");
    
    console.log(jsonfile[hourCounter]);
    console.log(jsonfile[hourCounter].comm);
    


    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.newMeasurement(jsonfile[hourCounter].comm*decimals, jsonfile[hourCounter].d1*decimals, jsonfile[hourCounter].d2*decimals, jsonfile[hourCounter].d3*decimals, jsonfile[hourCounter].pv*decimals, jsonfile[hourCounter].bat*decimals, jsonfile[hourCounter].omiePrice*decimals, jsonfile[hourCounter].accessTariff*decimals, jsonfile[hourCounter].networkFee*decimals, {from: account});
   
    }).catch(function(e) {
      console.log(e);
      //self.setStatus("Error getting measurmentes; see log.");
    });
    localStorage.setItem("hourCounter", hourCounter);


    setTimeout(App.addHour, 5000);
    
  },

  refreshHour: function(){
    var hourCounter = localStorage.getItem("hourCounter");
    var aux1 = document.getElementById("currentHour");
    aux1.innerHTML = hourCounter;
    localStorage.setItem("hourCounter", hourCounter);
  },
  
  addHour: function(){
    var self = this;
    var hourCounter = localStorage.getItem("hourCounter");
    hourCounter++;
    var aux1 = document.getElementById("currentHour");
    aux1.innerHTML = hourCounter;
    localStorage.setItem("hourCounter", hourCounter);
  },

  liquidationOfTransactions: function(){
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.liquidationOfTransactions({from: account, gas:3000000});
    }).then(function() {
      self.refreshBalanceInstantaneo();
      self.refreshBalanceInstantaneoDSO();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error in liquidation; see log.");
    });
  },

  openTab: function(evt, tab) {
      // Declare all variables
      var self = this;
      var i, tabcontent, tablinks;

      // Get all elements with class="tabcontent" and hide them
      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++) {
          tabcontent[i].style.display = "none";
      }

      // Get all elements with class="tablinks" and remove the class "active"
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) {
          tablinks[i].className = tablinks[i].className.replace(" active", "");
      }

      // Show the current tab, and add an "active" class to the button that opened the tab
      document.getElementById(tab).style.display = "block";
      evt.currentTarget.className += " active";
      if(tab=="Owner"){
        ownerOrUser = 0;
        self.refreshBalanceEC();
        self.refreshBalanceSCP();
      }
      if(tab=="User"){
        ownerOrUser = 1;
        self.refreshBalanceEC();
        self.refreshBalanceSCP();
      }
      if(tab=="Events"){
        self.events();
      }
  },
  plot: function(){
    var self = this;
    var hourCounter = localStorage.getItem("hourCounter");
    var hourNonReset = localStorage.getItem("hourNonReset");

    var id = parseInt(document.getElementById("idUSERToShow").value);
    var fromh = parseInt(document.getElementById("fromh").value);
    var toh = parseInt(document.getElementById("toh").value);
    
    var dataDemandUser = [];
    var dataPV = [];
    var dataComm = [];
    var dataBatt = [];
    var dataInstBal =[];
    var dataInstBalDSO = [];
    var dataEconomics =[];
    var dataEconomicsDSO = [];
    var time=[];

    //feel array time with hours of simulations
    for(var i = fromh; i < toh+1; i ++){
      time.push(i);   

    }
    //Get measurements from smartmeters from smart contract for their plots
    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMeasurementsOfASmartMeter(id, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = fromh-1+Number(hourNonReset); i < toh+Number(hourNonReset); i ++){
        var auxil = aux2[i]/decimals;
        dataDemandUser.push(auxil);
      }
      
    var ctx = document.getElementById("demand");
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
         labels: time,
          datasets: [{ 
              data: dataDemandUser,
              label: "User demand",
              borderColor: "#3e95cd",
              fill: false
            }
          ]
        },
        options: {
          title: {
            display: true,
            text: 'Demand (kWh)'
          }
        }
      });
    });
    
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMeasurementsOfASmartMeter(0, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        var auxil = aux2[i]/decimals;
        dataComm.push(auxil);
      }
    
    }).then(EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMeasurementsOfASmartMeter(4, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        dataPV.push(aux2[i]/decimals);
      }
    })).then(EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMeasurementsOfASmartMeter(5, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        dataBatt.push(aux2[i]/decimals);
      }
      var ctx = document.getElementById("commPVBat");
      var myChart = new Chart(ctx, {
        type: 'line',
        data: {
         labels: time,
          datasets: [{ 
              data: dataComm,
              label: "Community load",
              borderColor: "#3e95cd",
              fill: false
            }, { 
              data: dataPV,
              label: "PV",
              borderColor: "#FF5733",
              fill: false
            }, { 
              data: dataBatt,
              label: "Battery",
              borderColor: "#D4D11D",
              fill: false
            }
          ]
        },
        options: {
          title: {
            display: true,
            text: 'Community, PV and Battery measurements (kWh)'
          }
        }
      });
    }));
    
    //Get data from economic transactions arrays
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMyEconomicTransactions(id, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        var auxil = aux2[i]/decimals*(-1);
        dataEconomics.push(auxil);
      }
    
    }).then(EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMyInstaneousBalance(id, {from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        dataInstBal.push(aux2[i]/decimals*(-1));
      }
      var ctx = document.getElementById("economictransactions");
      var myChart = new Chart(ctx, {
          type: 'bar',
          data: {
           labels: time,
            datasets: [{ 
                data: dataEconomics,
                label: "Hourly transaction",
                borderColor: "#15740D",
                backgroundColor: "#15740D",
                fill: true
              }, { 
                data: dataInstBal,
                label: "Accumulated balance",
                borderColor: "#15740D",
                fill: false,
                type: 'line'
              }
            ]
          },
          options: {
            title: {
              display: true,
              text: 'User economics (EC)'
            }
          }
        });
    }));

    //Get data from instantaneous balance arrays
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getDSOEconomicTransaction({from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        var auxil = aux2[i]/decimals;
        dataEconomicsDSO.push(auxil);
      }
    
    }).then(EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getDSOInstataneousBalance({from: account});
    }).then(function(value) {
      var aux2 = value.valueOf();
      for(var i = (fromh-1+Number(hourNonReset)); i < (toh+Number(hourNonReset)); i ++){
        dataInstBalDSO.push(aux2[i]/decimals);
      }
      var ctx = document.getElementById("instBal");
      var myChart = new Chart(ctx, {
          type: 'bar',
          data: {
           labels: time,
            datasets: [{ 
                data: dataEconomicsDSO,
                label: "hourly transaction",
                borderColor: "#7A1288",
                backgroundColor: "#7A1288",
                fill: false
              }, { 
                data: dataInstBalDSO,
                label: "Accumulated balance",
                borderColor: "#7A1288",
                fill: false,
                type: 'line'
                
              }
            ]
          },
          options: {
            title: {
              display: true,
              text: 'DSO economics (EC)'
            }
          }
        });
    }));
    
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  refreshNumberOfUsers: function(){
    var self = this;

    var meta1;
    EnergyCommunity.deployed().then(function(instance){
      meta1=instance;
      return meta1.numberOfUsers.call();
    }).then(function(value) {
      lengthOfUsers = value.valueOf();
      var balance_element = document.getElementById("usersLength");
      balance_element.innerHTML = lengthOfUsers;
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying number of users; see log.");
      });
  },

    refreshBalanceInstantaneoDSO: function(){
    var self = this;

    

    var meta1;
    EnergyCommunity.deployed().then(function(instance){
      meta1=instance;
      return meta1.balanceInstantaneoDSO.call();
    }).then(function(value) {
      var aux = value.valueOf();
      var balance_element = document.getElementById("balanceInstantaneoDSO");
      balance_element.innerHTML = aux/decimals;
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying balance instantaneo del DSO; see log.");
      });
  },


  refreshBalanceInstantaneo: function(){
    var self = this;

    var meta1;
    EnergyCommunity.deployed().then(function(instance){
      meta1=instance;
      return meta1.users(0);
    }).then(function(value) {
      var aux = value.valueOf();
      var balance_element = document.getElementById("balanceInstantaneo1");
      balance_element.innerHTML = aux[2]/decimals*(-1);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying balance instantaneo; see log.");
      });

    var meta2;
    EnergyCommunity.deployed().then(function(instance){
      meta2=instance;
      return meta2.users(1);
    }).then(function(value) {
      var aux = value.valueOf();
      var balance_element = document.getElementById("balanceInstantaneo2");
      balance_element.innerHTML = aux[2]/decimals*(-1);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying balance instantaneo; see log.");
      });

    var meta3;
    EnergyCommunity.deployed().then(function(instance){
      meta3=instance;
      return meta3.users(2);
    }).then(function(value) {
      var aux = value.valueOf();
      var balance_element = document.getElementById("balanceInstantaneo3");
      balance_element.innerHTML = aux[2]/decimals*(-1);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying balance instantaneo; see log.");
      });
  },

  refreshNumberOfSmartMeters: function(){
    var self = this;

    var meta1;
    EnergyCommunity.deployed().then(function(instance){
      meta1=instance;
      return meta1.numberOfSmartMeters.call();
    }).then(function(value) {
      var numberOfSM = value.valueOf();
      var aux = document.getElementById("numberOfSM");
      aux.innerHTML = numberOfSM;
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying number of users; see log.");
      });
  },

  userChange: function(){
    var self = this;
    var x = document.getElementById("userList").value;
    document.getElementById("user").innerHTML = x;
  },
  refreshBalanceEC: function() {
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMyBalanceEC.call({from: account});
    }).then(function(value) {
      if(ownerOrUser == 0){
        var balance_element = document.getElementById("balanceECOwner");
        balance_element.innerHTML = value.valueOf();
      }else{
        var balance_element = document.getElementById("balanceECUser");
        balance_element.innerHTML = value.valueOf();
      }
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance EC; see log.");
    });
  },

    refreshBalanceSCP: function() {
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMyBalanceSCP.call({from: account});
    }).then(function(value) {
      if(ownerOrUser == 0){
        var balance_element = document.getElementById("balanceSCPOwner");
        balance_element.innerHTML = value.valueOf();
      }else{
        var balance_element = document.getElementById("balanceSCPUser");
        balance_element.innerHTML = value.valueOf();
      }
      
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance SCP; see log.");
    });
  },

  refreshPrices: function(){
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.priceOfECCoins.call({from: account});
    }).then(function(value) {
      var aux1 = document.getElementById("priceOfECCoins");
      aux1.innerHTML = (value.valueOf()/euroToWei);
    });
    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.priceOfSCPTokens.call({from: account});
    }).then(function(value) {
      var aux2 = document.getElementById("priceOfSCPTokens");
      aux2.innerHTML = (value.valueOf()/decimals);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying prices; see log.");
    });
  },

  refreshPowerContracted: function(){
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.powerContracted.call({from: account});
    }).then(function(value) {
      var aux1 = document.getElementById("ContPowerComm");
      aux1.innerHTML = (value.valueOf()/decimals);
    });

    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.priceOfPowerContractedPerHour.call({from: account});
    }).then(function(value) {
      var aux2 = document.getElementById("ContPowerPrice");
      aux2.innerHTML = (value.valueOf()/decimals*24);
    });

    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.maxPowerInOrOut.call({from: account});
    }).then(function(value) {
      var aux3 = document.getElementById("maxPowerInOrOut");
      aux3.innerHTML = (value.valueOf()/decimals);
    });
  },

  refreshNumberOfSCPTokens: function(){
    var self = this;

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.numberOfSCPTokens.call({from: account});
    }).then(function(value) {
      var aux1 = document.getElementById("numberOfSCPTokens");
      aux1.innerHTML = value.valueOf();
    });
    EnergyCommunity.deployed().then(function(instance){
      meta=instance;
      return meta.numberOfSCPTokensRemaining.call({from: account});
    }).then(function(value) {
      var aux2 = document.getElementById("numberOfSCPTokensRemaining");
      aux2.innerHTML = value.valueOf();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error displaying number of SCP tokens; see log.");
    });
  },

  mintSCPTokens: function() {
    var self = this;

    var amount = parseInt(document.getElementById("amount").value);
    var price = document.getElementById("priceSCP").value * decimals;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.mintSCPTokens(amount, price, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceSCP();
      self.refreshNumberOfSCPTokens();
      self.refreshPrices();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error minting SCP tokens; see log.");
    });
  },

  getMeasurementsOfASmartMeter: function() {
    var self = this;

    var id = parseInt(document.getElementById("idSMToShow").value);
    var aux2 = document.getElementById("idOfSm");
    aux2.innerHTML = id;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.getMeasurementsOfASmartMeter(id, {from: account});
    }).then(function(value) {
      self.setStatus("Transaction complete!");
      var aux2 = value.valueOf();
      for(var i = 0; i < aux2.length; i ++){
        aux2[i]/=decimals;
      }

      var aux1 = document.getElementById("measurementsOfSM");
      aux1.innerHTML = self.makeTableHTML(aux2);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting measurements; see log.");
    });
  },

  makeTableHTML: function(myArray) {
    var result = "<table border=1>";
    for(var i=0; i<myArray.length; i++) {
        result += "<tr>";
        result += "<td>"+"hour "+(i+1)+"</td>";
        result += "<td>"+myArray[i] +" kWh"+"</td>";
        
    }
    result += "</table>";

    return result;
},

  setPriceOfECCoins: function() {
    var self = this;

    var price = document.getElementById("priceEC").value * euroToWei;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.setPriceOfECCoins(price, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshPrices();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error setting price of EC coins; see log.");
    });
  },

  setContractedPower: function() {
    var self = this;

    var price = document.getElementById("pricePower").value*decimals/24;
    var powerCont = document.getElementById("PowerContracted").value*decimals;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.setContractedPower(powerCont, price, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshPowerContracted();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error setting price of EC coins; see log.");
    });
  },

  addNewUser: function() {
    var self = this;

    var user = document.getElementById("userAddress").value;
    var id = document.getElementById("id").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.addNewUser(user, id, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshNumberOfUsers();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error adding user; see log.");
    });
  },

  addNewSmartMeter: function() {
    var self = this;

    var id = document.getElementById("smartMeterid").value;
    var typeSM = document.getElementById("smartMeterType").value;
    var fromuser = document.getElementById("SMfromUser").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.addNewSmartMeter(id, typeSM, fromuser, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshNumberOfSmartMeters();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error adding smart meter; see log.");
    });
  },

  defineDSO: function() {
    var self = this;
    //Next three lines are used to initialized timing for simulation in the storage of the PC since in the prototype this
    //function is only called once and before starting simulating
    var hourNonReset = localStorage.getItem("hourNonReset");
    hourNonReset = 0;
    localStorage.setItem("hourNonReset", hourNonReset);

    var address = document.getElementById("DSOAddress").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.defineDSO(address, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error defining DSO address; see log.");
    });
  },

  buyECCoins: function() {
    var self = this;

    var quantity = document.getElementById("numberECToBuy").value;
    var priceEC = document.getElementById("priceOfECCoins").innerText * euroToWei;
    var valueTransaction = quantity * priceEC;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.buyECCcoins(quantity, {from: account, value: valueTransaction, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceEC();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error buying EC coins; see log.");
    });
  },

  buySCPTokens: function() {
    var self = this;
    var quantity = document.getElementById("numberSCPToBuy").value;
    this.setStatus("Initiating transaction... (please wait)");
    var meta;

    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.buySCPTokens(quantity, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceSCP();
      self.refreshBalanceEC();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error buying SCP coins; see log.");
    });
  },

  givePermission: function() {
    var self = this;

    var addressTo = document.getElementById("addressTo").value;
    var quantity = document.getElementById("numberSCPToGive").value;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.givePermission(addressTo, quantity, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error giving permission; see log.");
    });
  },

  buySCPTokensFromOtherUser: function(){
    var self = this;

    var addressFrom = document.getElementById("addressFrom").value;
    var quantity = document.getElementById("numberSCPToBuyFromUser").value;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.buySCPTokensFromOtherUser(addressFrom, quantity, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceSCP();
      self.refreshBalanceEC();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error giving permission; see log.");
    });
  },

  burnECCOins: function(){
    var self = this;

    var quantity = document.getElementById("burnEC").value;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.burnECCOins(quantity, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceEC();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error giving permission; see log.");
    });
  },

  burnSCPTokens: function(){
    var self = this;

    var quantity = document.getElementById("burnSCP").value;
    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.burnSCPTokens(quantity, {from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalanceSCP();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error giving permission; see log.");

    });
  },

  withdraw: function(){
    var self = this;


    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.withdraw({from: account, gas: 300000});
    }).then(function() {
      self.setStatus("Transaction complete!");

    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error withdrawing; see log.");
    });
  },

  events: function(){
    var self = this;
    var ul = document.getElementById("listEvents");
    ul.innerHTML = "";
    var meta;
    EnergyCommunity.deployed().then(function(instance) {
      meta = instance;
      return meta.allEvents({fromBlock: 0, toBlock: 'latest'});
    }).then(function(value){
      var events = value;
      events.watch(function(error, result){
        //console.log(result);
        var node = document.createElement("LI");
        if(result.event == "NewUserCreated"){
          var textnode = document.createTextNode(result.event +": id= "+ result.args.UserId +", address= " + result.args.UserAddress + "; block number: " + result.blockNumber);
        }else if(result.event == "AllSCPTokensSold"){
          var textnode = document.createTextNode(result.event  + "; block number: " + result.blockNumber);
        }else if(result.event == "UserRemoved"){
          var textnode = document.createTextNode(result.event  +": id= "+ result.args.UserId+ "; block number: " + result.blockNumber);
        }else if(result.event == "NewSmartMeterCreated"){
          var textnode = document.createTextNode(result.event +": id= "+ result.args.SMId + ", type= " + result.args.Type +"; block number: " + result.blockNumber);
        }else if(result.event == "NewMeasurement"){
          var textnode = document.createTextNode(result.event +": community= "+ result.args.Comm/decimals +"kW , d1= " + result.args.D1/decimals + "kW , d2= " + result.args.D2/decimals + "kW , d3= " + result.args.D3/decimals + "kW , PV= " + result.args.PV/decimals + "kW , Batt= " + result.args.Batt/decimals +"kW ; block number: " + result.blockNumber);
        }else if(result.event == "NewMarketPrice"){
          var textnode = document.createTextNode(result.event +": PoolPrice= "+ result.args.PoolPrice/decimals +"€/kWh , AccessTariff= " + result.args.AccessTariff/decimals + "€/kWh , NetworkFee= " + result.args.NetworkFee/decimals +"€/kWh ; block number: " + result.blockNumber);
        }else if(result.event == "LiquidationDone"){
          var textnode = document.createTextNode(result.event +": Value= " + result.args.Value/decimals +"EC, From: "+ result.args.From +" , To: " + result.args.to + "; block number: " + result.blockNumber);
        }else if(result.event == "PowerContractedPayment"){
          var textnode = document.createTextNode(result.event +": Value= " + result.args.PowerPayment/decimals + " EC, User 1 contribution: " + result.args.Percentage1/10 +" %, User 2 contribution: "+ result.args.Percentage2/10 +" %, User 3 contribution: "+ result.args.Percentage3/10 +"% ; block number: " + result.blockNumber);
        }


        node.appendChild(textnode);
        var list = document.getElementById("listEvents");
        list.insertBefore(node, list.firstChild);

      });
    });
  }


};
 
window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});