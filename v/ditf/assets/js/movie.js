$(function(){


	$("#floatMovie").find(".wrap").click(function(){
		$("#floatMovie").velocity({opacity:0},{
			duration:200,
			complete:function(){
				$(this).hide();
				$(this).find(".player").empty();
			}
		})
	})


	$(".movie_list li").click(function(){
		var id = $(this).attr("data-id");
		var iframe = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/'+ id +'?rel=0&showinfo=0&autoplay=1" frameborder="0" allowfullscreen></iframe>';
		$("#floatMovie").find(".player").html(iframe);

		$("#floatMovie").show().velocity({opacity:1},{
			duration:200
		})
	})
})