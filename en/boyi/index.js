  //let times=0;
  //let wins=0;
  //let loses=0;
  //let money=100000;
  //let allWins=0;
  //let justWon=0;
  //let allLoses=0;
  //let justLost=0;
window.onload=function(){
//let d=new Date();
setOdds();
setLocalStorage();
// alert("��Q2895114276��ȡ���һ�������꣡");
// alert("������Ҳ�ƭ�㣡");
}

function setOdds(){
	let num=Math.random();
	//document.getElementById("odds").value=Number(num.toFixed(3))+1.5
	document.getElementById("odds").value=num+1.5;
	setTimeout("setOdds()",10*1000);
}

function press(){
	if (event.keyCode==13){
		go();
	}
}

function go(){
  given=document.getElementById("given").value;
  nG=Number(given);
  if(given=="twitter@iliyian01"){alert("Renter");return false;}
  if(Number(DATA.money)<1){alert("You have lost all your net worth! you failed!");window.close();return false;}
  if(nG==""){alert("Please enter the amount!");return false;}
  if (isNaN(nG)){alert("The bet amount must be a number!");return false;}
  if (nG==0||nG<0){alert("The bet amount must be greater than 0!");return false;}
  odds=document.getElementById("odds").value;
  nO=Number(odds);
  if (isNaN(nO)){alert("The odds must be numeric!");return false;}
  if (nO==0||nO<0){alert("The odds must be greater than 0!");return false;}
  if (nG>Number(DATA.money)){alert("You don't have that much money!");return false;}
  if (nG>(0.8*DATA.money)){
	  if (confirm("Are you sure you are desperate?")){
		  alert("In reality you will definitely not do this.")
	  }else{
		  alert("Please think about it");return false;
		}
  }
  document.getElementById("given").value="";
  
  autoChangeNotice();
  DATA.times=Number(DATA.times)+1;
  
  alert("Betting successful! Please wait for 1.62 seconds to draw!");
  DATA.money=Number(DATA.money)-nG;
  document.getElementById("times").innerHTML=">>>You are running <b>"+DATA.times+"</b> time��<<<";
  document.getElementById("money").innerHTML="You have <b>"+DATA.money+"</b> counts rest.";
  t=setTimeout("after()",1.62*1000);
  //DATA.clear();
}

  function after(){
  clearTimeout(t);
  let num=Math.random();
  if(Math.round(num)==1){
    DATA.money=Number(DATA.money)+nG*nO;
	DATA.wins=Number(DATA.wins)+1;
	DATA.justWon=nG*nO;
	DATA.allWins=Number(DATA.allWins)+Number(DATA.justWon);
    DATA.justLost=0;
	document.getElementById("just").innerHTML="You just won <b>"+DATA.justWon+"</b> counts.";
	alert("Thanks!");
}
  else{
	DATA.loses=Number(DATA.loses)+1;
	DATA.justLost=nG;
	DATA.allLoses=Number(DATA.allLoses)+Number(DATA.justLost);
	DATA.justWon=0;
    document.getElementById("just").innerHTML="You just lost "+DATA.justLost+"</b> counts.";
	alert("Honstly apologize!");
}
document.getElementById("times").innerHTML=">>>You won <b>"+DATA.times+"</b> times totally.<<<";
document.getElementById("wins").innerHTML="You have won <b>"+DATA.wins+"</b> times��";
document.getElementById("loses").innerHTML="You have failed <b>"+DATA.loses+"</b> times��";
document.getElementById("money").innerHTML="You have rest <b>"+DATA.money+"</b> counts��";
document.getElementById("All").innerHTML="You have��<b>"+DATA.allWins+"</b> counts;<br/>You have lost ��<b>"+DATA.allLoses+"</b> times��";
}