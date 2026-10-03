function _c(l){
	console.log(l);
}
function _r(x){
	return Math.floor(Math.random()*x);
}

$(function(){

	$(".mainTitle").chaffle({
		speed:5
	}).trigger('mouseover');
    

	$('.main_menu').find("a").chaffle({
		speed:5
	});
	$(".chaffle_over").chaffle({
		speed:5
	});

	$("header").find(".menu").click(function(){
		var cl = $(this).attr("class");
		if(cl.indexOf("open") > 0 ){
			$("header").removeClass('open')
			$(this).removeClass('open')
			$("#navigation").removeClass('alpha')
			setTimeout(function(){
				$("#navigation").removeClass('open');
			},500)
		}else{
			$("#navigation").addClass('open')
			
			$(this).addClass('open')
			setTimeout(function(){
				$("#navigation").addClass('alpha')	
			},20)
			setTimeout(function(){
				$("header").addClass('open')
			},500)
		}

	});

	$(".pagetop").click(function(){
		$("body,html").animate({scrollTop:0},600)
	})


	var num = _r(4)+1;
	$(".bg_pc").addClass("bg"+num);
	$(".sp_bg").addClass("bg"+num);

	var bnr = new setBaner();
})


function setBaner(){
	var _this = this;

	// this.flip = Flipsnap("#banner_sp .slide ul");
	// $("#banner_sp").find(".next").click(function(){
	// 	_this.flip.toNext();
	// })

	// $("#banner_sp").find(".prev").click(function(){
	// 	_this.flip.toPrev();
	// })

	// $(window).resize(function(){
	// 	_this.flip.refresh();
	// })
	
	this.max = $("#banner_pc").find("li").length
	this.pc_cnt = 0;
	this.pc_bnr();

}

setBaner.prototype.pc_bnr = function(){
	var _this = this;
	_this.h = $("#banner_pc").find("li").height();

	$("#banner_pc").find(".down").click(function(){
		_this.pc_cnt++;
		if(_this.pc_cnt == _this.max){
			_this.pc_cnt = _this.max-1
		}
		$("#banner_pc").find("ul").velocity({translateY:_this.pc_cnt*_this.h*-1},200,'easeInSine')

		if(_this.pc_cnt == _this.max-1){
			$("#banner_pc").find(".down").addClass("last");
		}else{
			$("#banner_pc").find(".down").removeClass("last");
			$("#banner_pc").find(".up").removeClass("last");
		}
	})
	$("#banner_pc").find(".up").click(function(){
		_this.pc_cnt--;
		if(_this.pc_cnt < 0){
			_this.pc_cnt = 0
		}
		$("#banner_pc").find("ul").velocity({translateY:_this.pc_cnt*_this.h*-1},200,'easeInSine')

		if(_this.pc_cnt > 0){
			$("#banner_pc").find(".up").removeClass("last");
			$("#banner_pc").find(".down").removeClass("last");
		}else{
			$("#banner_pc").find(".up").addClass("last");
		}
	})
}