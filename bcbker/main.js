
window.onload = function () {
	window.asked = false;
	window.lost = false;
	window.speed = 0.2;
	preparePage();
}

function preparePage() {
	$("<div id='prepare'></div>").appendTo("body");
	$("<div class='prepare_start'><br/>Click to start</div>").appendTo("#prepare");
	$("<div class='prepare_sets'><br/>Settings</div>").appendTo("#prepare");

	let start = $("#prepare div.prepare_start");
	let set = $("#prepare div.prepare_sets");
	start.css("top", "20%");
	set.css("top", "40%");

	start.click(function () {
		pageanimate();
	});
	set.click(function () {
		sets();
	});
}

function pageanimate() {
	let chance = localStorage.getItem("chance");
	if (chance == 0 && asked == false) {
		alert("Now you have got no chance.");
		asked = true;
		return;
	} else if ((typeof chance == "undefined" || chance == "null") && asked == false) {
		alert("Don't you set the chance?");
		asked = true;
		return;
	}

	let start = $("#prepare div.prepare_start");
	let set = $("#prepare div.prepare_sets");

	let speed1 = Math.ceil(Math.random() * 500) + 500;
	let way1 = Math.ceil(Math.random() * 4);
	let speed2 = Math.ceil(Math.random() * 500) + 500;
	let way2 = Math.ceil(Math.random() * 4);
	switch (way1) {
		case 1:
			var move1 = {
				right: "100%"
			};
			break;
		case 2:
			var move1 = {
				left: "100%"
			};
			break;
		case 3:
			var move1 = {
				top: "100%"
			};
			break;
		case 4:
			var move1 = {
				top: "-50%"
			};
			break;
	}
	switch (way2) {
		case 1:
			var move2 = {
				right: "100%"
			};
			break;
		case 2:
			var move2 = {
				left: "100%"
			};
			break;
		case 3:
			var move2 = {
				top: "100%"
			};
			break;
		case 4:
			var move2 = {
				top: "-50%"
			};
			break;
	}
	start.animate(move1, speed1, function () {
		set.animate(move2, speed2, function () {
			setTimeout(function () {
				$("#prepare").remove();
				csh();
			}, Math.ceil(Math.random() * 1000));
		});
	});
}

function csh() {
	$("<div id='main'></div>").appendTo("body");
	$("<div id='con'></div>").appendTo("#main");
	$("#con").css("top", "-25%");
	for (let i = 0; i < 5; i++) {
		let num = Math.floor(Math.random() * 4);
		$("<div class='line'></div>").appendTo("#con");
		for (let bo = 0; bo < 4; bo++) {
			let nb = $("<div class='block'></div>");
			nb.appendTo("div.line:last");
			if (bo == num) {
				nb.addClass("black");
			}
		}
	}

	$("#main div.black").last().text("Start").addClass("startBlock");

	$("#main div.block:not('#main div.startBlock')").click(function () {
		click(this);
	});

	$("#main div.startBlock").click(function () {
		start();
	});
}

function sets() {

	aksed = false;

	/*let speedChange=confirm("The code of speed change isn't perfect, enable it?");
	speedChange?localStorage.setItem("speedchange",true):localStorage.setItem("speedchange",false);*/

	let chance = prompt("How many chances for you?(<10");
	if (isNaN(chance)) {
		alert("Please enter a number!");
		chance;
	} else if (chance > 10) {
		alert("You can only have up to five chances.");
		chance;
	} else {
		localStorage.setItem("chance", chance);
	}
}

function move() {
	let con = document.getElementById("con");
	let top = parseInt(con.style.top);
	if (top + speed > 0) {
		con.style.top = "-25%";
		dline();
		cline();
	} else {
		top += speed;
		con.style.top = top + "%";
	}
	moving = setTimeout(function () {
		move()
	}, 20);
	//typeof times=="undefined" ? times=1 : times++;
	check();
	//if(times%100==0){speed+=0.02};
}

function check() {
	let chance = localStorage.getItem("chance");
	if ($("#main div.line:last").children().not("#main div.line div.startBlock").hasClass("black")) {
		if (Number(chance) > 0) {
			$("#main div.black:last").removeClass("black")
				.css("background-color", "black")
				.fadeOut(1236);
			chance--
			localStorage.setItem("chance", chance);
			return true;
		}
		lost = true;
		clearTimeout(moving);
		$("#main div.black:last").removeClass("black").addClass("red");
		playMusic("err");
		setTimeout(function () {
			lose();
		}, Math.ceil(Math.random() * 1000));
	}
}

function cline() {
	$("<div class='line'></div").insertBefore("#main div.line:first");
	let n = Math.floor(Math.random() * 4);
	for (let i = 0; i < 4; i++) {
		$("<div class='block'></div>").appendTo("#main div.line:first");
		if (i == n) {
			$("#main div.line:first div.block:eq(" + i + ")").addClass("black");
		}
	}
	$("#main div.line:first div.block").click(function () {
		click(this);
	});
}

function dline() {
	$("#main div.line:last").remove();
}

function start() {
	lost = false;
	move();
	click($("#main div.startBlock")[0]);
	setInterval(function () {
		removeOldMusic()
	}, 1000);
}

function click(which) {
	/*if($(which).parent().index()!=$("#con div.line:has(div.black)").last().index()){
		return false;
	}*/
	if (lost) {
		return false;
	}
	switch (true) {
		case which.classList.contains("black"):
			$(which).fadeOut(400);
			$(which).removeClass("black").addClass("grey");
			scored(which);
			playMusic("normal");
			break;
		case which.classList.contains("grey"):
			return false;
		default:
			playMusic("err");
			$(which).removeClass("white").addClass("red");
			lost = true;
			if (typeof moving == "undefined") {
				theScore = 0;
			}
			clearTimeout(moving);
			setTimeout(function () {
				lose();
			}, Math.ceil(Math.random() * 1000));
			break;
	}
}

function scored(which) {
	if ($(which).hasClass("startBlock")) {
		which.innerText = "";
	}
	if (typeof theScore == "undefined") {
		theScore = 0;
	}
	if (typeof localStorage.getItem("bestScore") == "undefined") {
		localStorage.setItem("bestScore", 0);
	}
	theScore++;
	if (theScore > Number(localStorage.getItem("bestScore"))) {
		localStorage.setItem("bestScore", theScore);
	}
}

function lose() {
	$("#main").remove();
	$("<div id='lose'></div>").appendTo("body");
	$("<div class='score'>You have got: " + theScore +
		" scores.<br/>Your best score is: " +
		localStorage.getItem("bestScore") +
		".</div>").appendTo("#lose");
	$("<div class='again'><br/>Continue</div>").appendTo("#lose");
	$("#lose div.again").click(function () {
		$("#lose").remove();
		preparePage();
	})
}

function playMusic(zzz) {
	if (zzz == "err") {
		var which = "err";
		var houzhui = ".wav";
	} else {
		var which = Math.ceil(Math.random() * 5);
		var houzhui = ".mp3";
	}
	$("<audio src='msc/" + which + houzhui +
		"' autoplay='autoplay'" +
		" style='display:none'" +
		"></audio>").appendTo("body");
}

function removeOldMusic() {
	let oldmusic = document.getElementsByTagName("audio");
	if (typeof oldmusic != "undefined") {
		for (let i = 0; i > oldmusic.length; i++) {
			if (oldmusic[i].ended) {
				$(oldmusic[i]).remove();
			}
		}
	}
}