$(function(){

	$(".btn_movie").click(function(){
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

	
	var image = new changeImage();
	var chara = new changeChara();

})

function changeChara(){
	var _this = this;
	this.next = 0;
	this.flg = true;

	$(".chara_tab").find('li').click(function(){
		if($(this).attr("class") == "current"){
			return false;
		}
		if(_this.flg){
			_this.flg = false;

			_this.next = $(".chara_tab").find('li').index(this);
			_this.change();
		}
	})

	$(".next").unbind().click(function(){
		if(_this.flg){
			_this.flg = false;
			var now = 0;
			$(".chara_wrap").each(function(i){
				if($(this).attr("class").indexOf("current") > 0){
					now = i;
					return false;
				}
			})
			_this.next = now +1;
			if(_this.next == 28){
				_this.next = 0
			}

			_this.change();
		}
	})
	$(".prev").unbind().click(function(){
		if(_this.flg){
			_this.flg = false;
			var now =0;
			$(".chara_wrap").each(function(i){
				if($(this).attr("class").indexOf("current") > 0){
					now = i;
					return false;
				}
			})
			_this.next = now -1;
			if(_this.next < 0){
				_this.next = 27;
			}

			_this.change();
		}

	})
}
changeChara.prototype.change = function(){
	var _this = this;

		var $l = $(".chara_wrap.current").find(".left");
		var $r = $(".chara_wrap.current").find(".right");
		var $m = $(".chara_wrap.current").find(".franxx_cont");

		var $new_l = $(".chara_wrap").eq(_this.next).find(".left");
		var $new_r = $(".chara_wrap").eq(_this.next).find(".right");
		var $new_m = $(".chara_wrap").eq(_this.next).find(".franxx_cont");

		$l.find(".image,.name_wrap,.text, .btn_change").velocity({translateX:'-50%',opacity:0},{
			duration:300,
			easing:'easeInSine'
		})

		$r.find(".image,.name_wrap,.text").velocity({translateX:'50%',opacity:0},{
			duration:300,
			easing:'easeInSine'
		})

		$m.find(".image,.name_wrap,.text").velocity({translateX:'-50%',opacity:0},{
			duration:300,
			easing:'easeInSine'
		})

		$(".chara_wrap.current").velocity({opacity:0},{
			duration:300,
			delay:250,
			complete:function(){
				$(this).hide().removeClass('current');
			}
		})

		$new_l.find(".image,.name_wrap,.text").velocity({translateX:'-50%',opacity:0},{
			duration:0
		})

		$new_r.find(".image,.name_wrap,.text").velocity({translateX:'50%',opacity:0},{
			duration:0
		})
		$new_m.find(".image,.name_wrap,.text").velocity({translateX:'-50%',opacity:0},{
			duration:0
		})

		$(".chara_wrap").eq(_this.next).show().velocity({opacity:1},{
			duration:300,
			delay:250,
			complete:function(){
				$(this).addClass("current");
				var change = new changeImage();
				_this.flg = true;
			}
		})

		$new_l.find(".image,.name_wrap,.text,.btn_change").velocity({translateX:'0',opacity:1},{
			duration:300,
			delay:500
		})

		$new_r.find(".image,.name_wrap,.text").velocity({translateX:'0',opacity:1},{
			duration:300,
			delay:500
		})
		$new_m.find(".image,.name_wrap,.text").velocity({translateX:'0',opacity:1},{
			duration:300,
			delay:500,
			easing:'easeInSine'
		})

		_this.navi();


		// $(".chara_wrap.current").velocity({opacity:0},{
		// 	duration:500,
		// 	complete:function(){
		// 		$(this).hide().removeClass('current');
		// 	}
		// })
		// $(".chara_wrap").eq(_this.next).show().velocity({opacity:1},{
		// 	duration:500,
		// 	complete:function(){
		// 		$(this).addClass("current");
		// 		var change = new changeImage();
		// 		_this.flg = true;
		// 	}
		// })
		// _this.navi();
}
changeChara.prototype.navi = function(){
	var _this = this;
	$(".chara_tab").find('li').removeClass("current");
	$(".chara_tab").find('li').eq(_this.next).addClass("current");
}

function changeImage(){
	var _this = this;
	this.target = $(".chara_wrap.current");

	this.init();


	_this.target.find(".btn_change").unbind().click(function(){
		var cl = _this.target.find(".image .face").css("opacity");
		if(cl == 0){
			_this.target.find(".image .face, .image .stand").velocity({opacity:1},{
				duration:350,
				delay:250
			})
			_this.target.find(".image .face02, .image .stand02").velocity({opacity:0},{
				duration:300,
				easing:'easeInSine'
			})
		}else{
			_this.target.find(".image .face, .image .stand").velocity({opacity:0},{
				duration:300,
				easing:'easeInSine'
			})
			_this.target.find(".image .face02, .image .stand02").velocity({opacity:1},{
				duration:350,
				delay:250
			})
		}
		if($(window).width() < 751){
			$("#character").velocity('scroll',{
				duration:600,
				offset:-200,
				easing:'easeInOutSine'
			})
		}

	})

}

changeImage.prototype.init = function(){
	var _this = this;

	_this.target = $(".chara_wrap.current");
}