function setLocalStorage(){
	DATA=window.localStorage;
	
	
	if ((typeof DATA.times)==="undefined"){DATA.times=0;}
	if (Number(DATA.times)===0){
		document.getElementById("times").innerHTML=">>>Welcome to play my simple game.<<<";
	}
	if (Number(DATA.times)!==0){
		document.getElementById("times").innerHTML=">>>You have played <b>"+DATA.times+"</b> times。<<<";
	}
	
	
	if ((typeof DATA.money)==="undefined"||DATA.money==="NaN"){DATA.money=100000;}
	if (Number(DATA.money)<1){alert("Sorry that you have no mony, contact admin to restart.");}
	if (Number(DATA.money)>=1){
		document.getElementById("money").innerHTML="You have <b>"+DATA.money+"</b> to play yet.";
	}
	
	
	if ((typeof DATA.wins)==="undefined"||DATA.wins==="NaN"){DATA.wins=0;}
	if (Number(DATA.wins)>0){
		document.getElementById("wins").innerHTML="You have won <b>"+DATA.wins+"</b> times.";
	}
	if (Number(DATA.wins)===0){
		document.getElementById("wins").innerHTML="Just enter a digit and click button to start.";
	}
	
	
	if ((typeof DATA.loses)==="undefined"||DATA.loses==="NaN"){DATA.loses=0;}
	if (Number(DATA.loses)>0){
		document.getElementById("loses").innerHTML="You have lost <b>"+DATA.loses+"</b> times.";
	}
	if (Number(DATA.loses)===0){
		document.getElementById("loses").innerHTML="Have a good time.!";
	}
	
	
	if ((typeof DATA.allWins)==="undefined"||DATA.allwins==="NaN"){DATA.allWins=0;}
	if ((typeof DATA.allLoses)==="undefined"||DATA.allLoses==="NaN"){DATA.allLoses=0;}
	if (Number(DATA.allWins)>0||Number(DATA.allLoses)>0){
		document.getElementById("All").innerHTML="You have wond <b>"+DATA.allWins+"</b> counts;<br/>You have won <b>"+DATA.allLoses+"</b> counts totally.";
	}
	if (Number(DATA.allWins)===0&&Number(DATA.allLoses)===0){
		document.getElementById("All").innerHTML="The system will record counts autoly.";
	}
	
	
	if ((typeof DATA.justWon)=="undefined"||DATA.justWon=="NaN"){DATA.justWon=0;}
	if ((typeof DATA.justLost)=="undefined"||DATA.justLost=="NaN"){DATA.justLost=0;}
	if (Number(DATA.justWon)>0&&Number(DATA.justLost)===0){
		document.getElementById("just").innerHTML="You won <b>"+DATA.justWon+"</b> counts last time.";
	}
	if (Number(DATA.justWon)===0&&Number(DATA.justLost)>0){
		document.getElementById("just").innerHTML="You have lost <b>"+DATA.justLost+"</b> counts last time.";
	}
	if (Number(DATA.justWon)===0&&Number(DATA.justLost)===0){
		document.getElementById("just").innerHTML="This place for historical counts.";
	}
}

function autoChangeNotice(){
	document.getElementById("times").innerHTML="Hi~";
	document.getElementById("wins").innerHTML="Hey~";
	document.getElementById("loses").innerHTML="Hello~";
	document.getElementById("money").innerHTML="Ho~";
	document.getElementById("just"),innerHTML="Hu~";
	document.getElementById("All").innerHTML="Ha~";
}

function theRestore(){
	if ((typeof loveyou)==="undefined"){loveyou=0}
	if (loveyou===9){alert("Stop, that's enough");location.reload();}
	var code=document.getElementById("code").value;
	if (code==="Enter code"&&loveyou===0){
		alert("Oh my cut cat...");
		loveyou=loveyou+1;
	}else if (code==="Enter code"&&loveyou>0){
		alert("May you stop? "+(loveyou+1)+" times....");
		loveyou=loveyou+1;
	}else if (code===""){
		alert("Enter anything...?");
	}else if (code==="forRestore"){
		alert("How to verify remotely...?");
		DATA.clear();
		location.reload();
	}else{
		alert("That's wrong~~\nAsk the admin, twitter@iliyian");
	}
}