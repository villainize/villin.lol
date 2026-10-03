function _c(l){
	console.log(l);
}

window.onload = function(){
}

$(function(){

/////////////////////////loading
	var from = window.location.search.substring(1, window.location.search.length);
	var w = $(window).width();

	if(from == "from=lower"){
		setTimeout(function(){

			var width = new setVisual();
			//var visual = new moveVisual();
			var movie = new slide_movie();
			// var banner = new setBaner();

			$("#loading").velocity({opacity:0},{
				duration:900,
				easing:'easeInQuad',
				complete:function(){
					$(this).hide();
				}
			})
		},300)
	}else{

		setTimeout(function(){

			var width = new setVisual();
			//var visual = new moveVisual();
			var movie = new slide_movie();
			// var banner = new setBaner();

			$("#loading").velocity({opacity:0},{
				duration:1500,
				easing:'easeInQuad',
				complete:function(){
					$(this).hide();
				}
			})
		},1800)
	}
	



	$(".first_movie").click(function(){
		var id = $(this).attr("data-id");
		var iframe = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/'+ id +'?rel=0&showinfo=0&autoplay=1" frameborder="0" allowfullscreen></iframe>';
		$("#floatMovie").find(".player").html(iframe);

		$("#floatMovie").show().velocity({opacity:1},{
			duration:200
		})
	})

	$("#floatMovie").find(".wrap").click(function(){
		$("#floatMovie").velocity({opacity:0},{
			duration:200,
			complete:function(){
				$(this).hide();
				$(this).find(".player").empty();
			}
		})
	})
    
    
    $(".special_movie").click(function(){
		var id = $(this).attr("data-id");
		var iframe = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/'+ id +'?rel=0&showinfo=0&autoplay=0" frameborder="0" allowfullscreen></iframe>';
		$("#floatMovie_special").find(".player").html(iframe);

		$("#floatMovie_special").show().velocity({opacity:1},{
			duration:200
		})
	})

	$("#floatMovie_special").find(".wrap").click(function(){
		$("#floatMovie_special").velocity({opacity:0},{
			duration:200,
			complete:function(){
				$(this).hide();
				$(this).find(".player").empty();
			}
		})
	})

    $(".special_img").click(function(){
		$("#float_img").show().velocity({opacity:1},{
			duration:200
		})
	})

	$("#float_img").find(".wrap").click(function(){
		$("#float_img").velocity({opacity:0},{
			duration:200,
			complete:function(){
				$(this).hide();
				$(this).find("").empty();
			}
		})
	})

	$(".list").hover(function(){
		$(this).parent("li").velocity({backgroundColor:'#ddd'},250)
	},function(){
		$(this).parent("li").velocity({backgroundColor:'#efefef'},250)
	})
    
})

function slide_movie(){
	var _this = this;


	this.flap = '';
	if($(window).width() > 751){
		_this.flip = Flipsnap("#movie .slider ul",{
			distance:$(window).width()/3,
			maxPoint: $("#movie li").length -3
		});
	}else{
		_this.flip = Flipsnap("#movie .slider ul");
	}
	
	

	$("#movie").find(".next").click(function(){
		_this.flip.toNext();
	})

	$("#movie").find(".prev").click(function(){
		_this.flip.toPrev();
	})

	this.flip.element.addEventListener('fspointmove', function() {
		if(_this.flip.hasNext()){
			$("#movie").find(".next").removeClass("last");
		}else{
			$("#movie").find(".next").addClass("last");
		}

		if(_this.flip.hasPrev()){
			$("#movie").find(".prev").removeClass("last");
		}else{
			$("#movie").find(".prev").addClass("last");
		}
	}, false);

	$(window).resize(function(){
		var w = $(window).width();
		if(w > 750){
			_this.flip = Flipsnap("#movie .slider ul",{
				distance:$(window).width()/3,
				maxPoint: $("#movie li").length -3
			});
		}else{
			_this.flip = Flipsnap("#movie .slider ul");
		}
	})


	$("#movie li").click(function(){
		var id = $(this).attr("data-id");
		var iframe = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/'+ id +'?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen=""></iframe>';
		$("#floatMovie").find(".player").html(iframe);

		$("#floatMovie").show().velocity({opacity:1},{
			duration:200
		})
	})
        $("#float_img").show().velocity({opacity:1},{
            duration:200
        })
	
    // $(".open_movie").trigger('click');
}


// function setBaner(){
// 	var _this = this;

// 	this.flip = Flipsnap("#banner_sp .slide ul");
// 	$("#banner_sp").find(".next").click(function(){
// 		_this.flip.toNext();
// 	})

// 	$("#banner_sp").find(".prev").click(function(){
// 		_this.flip.toPrev();
// 	})

	
// 	this.flip.element.addEventListener('fspointmove', function() {
// 		if(_this.flip.hasNext()){
// 			$("#banner_sp").find(".next").removeClass("last");
// 		}else{
// 			$("#banner_sp").find(".next").addClass("last");
// 		}

// 		if(_this.flip.hasPrev()){
// 			$("#banner_sp").find(".prev").removeClass("last");
// 		}else{
// 			$("#banner_sp").find(".prev").addClass("last");
// 		}
// 	}, false);

// 	$(window).resize(function(){
// 		_this.flip.refresh();
// 	})
	
// 	this.max = $("#banner_pc").find("li").length
// 	this.pc_cnt = 0;
// 	this.pc_bnr();

// }

// setBaner.prototype.pc_bnr = function(){
// 	var _this = this;

// 	$("#banner_pc").find(".down").click(function(){
// 		_this.pc_cnt++;
// 		if(_this.pc_cnt == _this.max){
// 			_this.pc_cnt = _this.max-1
// 		}

// 		$("#banner_pc").find("ul").velocity({translateY:_this.pc_cnt*-100},200,'easeInSine')

// 		if(_this.pc_cnt == _this.max-1){
// 			$("#banner_pc").find(".down").addClass("last");
// 		}else{
// 			$("#banner_pc").find(".down").removeClass("last");
// 			$("#banner_pc").find(".up").removeClass("last");
// 		}
// 	})
// 	$("#banner_pc").find(".up").click(function(){
// 		_this.pc_cnt--;
// 		if(_this.pc_cnt < 0){
// 			_this.pc_cnt = 0
// 		}

// 		$("#banner_pc").find("ul").velocity({translateY:_this.pc_cnt*-100},200,'easeInSine')

// 		if(_this.pc_cnt > 0){
// 			$("#banner_pc").find(".up").removeClass("last");
// 			$("#banner_pc").find(".down").removeClass("last");
// 		}else{
// 			$("#banner_pc").find(".up").addClass("last");
// 		}
// 	})

// }


function moveVisual(){
	var _this = this;
	_this.init();

	$(window).resize(function(){
		_this.init();
	})
	_this.w = $(window).width();


	$("#mainImage").find("li").click(function(){

		var $t = $(this);
			var cl = $(this).attr("class");
			if(cl.indexOf("current") >0) {
				return false;
			}

		for(var i =0; i < 20; i++ ){
			$("#mainImage").append('<p class="over fs'+i+'"></p>');
		}
		if(_this.w < 751){
			$("#mainImage").find(".over").velocity({rotateZ:'15deg'})

			$("#mainImage").find(".over").each(function(i){
				var timer = i%2;
				$(this).velocity({height:'120%'},{
					duration:300,
					delay:350*timer,
					complete:function(){
					//	$(this).addClass("stop")
					}
				})
				.velocity({top:'100%',left:'-=48%'},{
					duration:300,
					delay:500
				})
			})

			setTimeout(function(){

				$("#mainImage").find("li").removeClass("current")
				$t.addClass("current")
			},1150)

		}else{


			$("#mainImage").find(".over").each(function(i){
				var timer = i%2;
				$(this).velocity({height:'120%'},{
					duration:500,
					delay:350*timer,
					complete:function(){
					//	$(this).addClass("stop")
					}
				})
				.velocity({top:'100%',left:'-=32%'},{
					duration:500,
					delay:350
				})
			})
			setTimeout(function(){
				$("#mainImage").find("li").removeClass("current");
				$t.addClass("current")
				$("#mainImage").find("li").find("img.pc").css({left:_this.w/-2+50})
				$t.find("img.pc").css({left:0})
			},850)
		}




///OK下
		// $("#mainImage").find("li").removeClass("current");
		// $(this).addClass("current")
		// $("#mainImage").find("li").find("img.pc").css({left:_this.w/-2+50})
		// $(this).find("img.pc").css({left:0})


	})
}

moveVisual.prototype.init = function(){
	var _this = this;
	if($(window).width() > 750){
		//PC

		_this.h = $("#mainImage .current").find("img.pc").height();
		$("#mainImage").find("ul").height(_this.h);

		_this.w = $("#mainImage .current").find("img.pc").width();

		$("#mainImage").find("li").each(function(){
			if($(this).attr("class").indexOf("current") < 0){
				$(this).find("img.pc").css({left:_this.w/-2+50})
			}
		})

	}else{
		$("#mainImage").find("ul").css({height:'auto'});
		_this.h = $("#mainImage .current").find("img.sp").height();
		_this.w = $("#mainImage .current").find("img.sp").width();
	}
}











function setVisual(){
	var _this = this;

	_this.init();
	_this.change();
	$(window).resize(function(){
		_this.init();
	})
}
setVisual.prototype.init = function(){
	var _this = this;
	if($(window).width() > 750){
		//PC

		_this.h = $("#mainImage .current").find("img.pc").height();
		$("#mainImage").find("ul").height(_this.h);

		_this.w = $("#mainImage .current").find("img.pc").width();

		$("#mainImage").find("li").each(function(){
			if($(this).attr("class").indexOf("current") < 0){
				$(this).find("img.pc").css({left:_this.w/-2+50})
			}
		})

	}else{
		$("#mainImage").find("ul").css({height:'auto'});
		_this.h = $("#mainImage .current").find("img.sp").height();
		_this.w = $("#mainImage .current").find("img.sp").width();
	}
}
setVisual.prototype.change = function(){
	var _this = this;

	if($(window).width() > 750){
		//PC
		$("#mainImage").find("li").click(function(){
			var cl = $(this).attr("class");
			if(cl.indexOf("current") >0) {
				return false;
			}
			$(this).addClass('open');
			$("#mainImage").find(".current").addClass("close");
			$("#mainImage").find("li").removeClass("current")
			$(this).find("img.pc").velocity({left:0},{
				duration:500,
				complete:function(){
				}
			})
			$("#mainImage").find(".close").find("img.pc").velocity({left:_this.w/-2+50},{
				duration:500
			})
			setTimeout(function(){
				$("#mainImage").find(".open").addClass('current').removeClass('open');
				$("#mainImage").find("li").removeClass("close")
			},520)
		})
	}else{
		$("#mainImage").find("li").click(function(){
			var cl = $(this).attr("class");
			if(cl.indexOf("current") >0) {
				return false;
			}


			$(this).addClass("open");


			$("#mainImage").find(".current").addClass("close");
			$("#mainImage").find("li").removeClass("current")

			setTimeout(function(){
				$("#mainImage").find(".open").addClass('current').removeClass('open');
				$("#mainImage").find("li").removeClass("close");

				$("#mainImage").find(".current").velocity('scroll',{
					duration:400,
					offset:$("header").height()*-1-30
				})
			},200)
		});
	}
}





function changeTwitterWidgetDesign(){
  var $twitter_widget = $('iframe.twitter-timeline');
  var $twitter_widget_contents = $twitter_widget.contents();
  
  if ($twitter_widget.length > 0 && $twitter_widget[0].contentWindow.document.body.innerHTML !== ""){
    $twitter_widget_contents.find('head').append('<link href="/assets/css/wejet.css" rel="stylesheet" type="text/css">');
  }
  else {
    setTimeout(function(){
      changeTwitterWidgetDesign();
    }, 350);
  }
}

changeTwitterWidgetDesign();