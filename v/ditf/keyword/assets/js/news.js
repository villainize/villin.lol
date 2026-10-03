$(function(){
	$(".list").hover(function(){
		$(this).parent("li").velocity({backgroundColor:'#ddd'})
	},function(){
		$(this).parent("li").velocity({backgroundColor:'#fff'})
	})
})