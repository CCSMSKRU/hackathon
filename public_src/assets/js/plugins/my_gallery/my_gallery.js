'use strict';

/*
* Галерея
* 1. Добавить .gallery_wrapper блоку, внутри которого будут все изображения
* 2. Добавить .gallery_image_wrapper блоку, по нажитию на который должна открываться галерея
* 3. Картинка должна быть всталена следующим образом:
*   <img class='gallery_image'
*   src='{{image.thumbnail}}'
*   data-label=''
*   data-small-src='{{image.file_small}}' data-full-src='{{image.file}}'>
*/
$(document).ready(function () {
	var log = false;
	var isGallery = false;
	var all_images_list = [];
	var current_image_id = void 0;

	var show_current_pic = function show_current_pic(curr_pic_data) {
		$('.g_full_picture').attr('src', curr_pic_data['smallSrc']);
		$('.g_label').html(curr_pic_data['label'] || '');
		$('.g_counter_current').html(current_image_id + 1);
		$('.g_counter_all').html(all_images_list.length);
		$('.gallery_full_view .source').attr('href', curr_pic_data['fullSrc']);
	};

	var next_picture = function next_picture() {
		current_image_id = current_image_id + 1 >= all_images_list.length ? 0 : current_image_id + 1;
		show_current_pic(all_images_list[current_image_id]);
	};

	var prev_picture = function prev_picture() {
		current_image_id = current_image_id == 0 ? all_images_list.length - 1 : current_image_id - 1;
		show_current_pic(all_images_list[current_image_id]);
	};

	var show_full_gallery = function show_full_gallery(e) {
		isGallery = true;
		all_images_list = [];
		var current_album = $(e.currentTarget).closest('.gallery_wrapper');
		var all_pics = current_album.find('.gallery_image');
		if (log) console.log('show_full_gallery all_pics', all_pics);
		//console.log('current_album:', current_album);
		// console.log('all_pics:', all_pics);
		if (all_pics.length <= 0) {
			if (log) console.log('show_full_gallery no pics');
			return;
		}
		var curr_pic = $(e.currentTarget).hasClass('gallery_image') ? $(e.currentTarget) : $(e.currentTarget).find('.gallery_image');
		var curr_pic_data = $(curr_pic).data();
		if ('smallSrc' in curr_pic_data) {
			for (var i = 0; i < all_pics.length; i++) {
				var pic = all_pics[i];
				var pic_data = $(pic).data();
				if (log) console.log('show_full_gallery pic', 'smallSrc' in pic_data, 'fullSrc' in pic_data);
				if ('smallSrc' in pic_data && 'fullSrc' in pic_data) {
					var pic_obj = {
						fullSrc: pic_data['fullSrc'],
						smallSrc: pic_data['smallSrc'],
						label: pic_data['label']
					};
					all_images_list.push(pic_obj);

					if (curr_pic_data.smallSrc === pic_obj.smallSrc) current_image_id = i;
				}
				// console.log('all_images:', all_images);
			}

			// console.log('all_images_list:', all_images_list, current_image_id);
			show_current_pic(all_images_list[current_image_id]);

			// console.log('index:', $(e.currentTarget).index());

			$('.back_for_gallery').show();
			$('.gallery_full_view').css('display', 'flex');

			$('body').css('overflow', 'hidden');
		}
	};

	var close_full_gallery = function close_full_gallery() {
		$('.back_for_gallery').hide();
		$('.gallery_full_view').hide();
		isGallery = false;

		$('body').css('overflow', 'auto');
	};

	$(document).off('click', '.gallery_image_wrapper').on('click', '.gallery_image_wrapper', function (e) {
		if (log) console.log('gallery_image_wrapper click', !($(e.target).hasClass('remove') || $(e.target).closest('.remove').length > 0));
		if (!($(e.target).hasClass('remove-trait-picture') || $(e.target).closest('.remove-trait-picture').length > 0)) {
			show_full_gallery(e);
		}
	});

	$(document).off('click', '.g_full_picture, .g_next_photo').on('click', '.g_full_picture, .g_next_photo', function () {
		next_picture();
	});

	$(document).off('click', '.g_prev_photo').on('click', '.g_prev_photo', function () {
		prev_picture();
	});

	$(document).off('click', '.close_full_view').on('click', '.close_full_view', function () {
		close_full_gallery();
	});

	$(document).keydown(function (e) {
		if (isGallery) {
			switch (e.which) {
				case 37:
					prev_picture();
					break; //left
				case 32:
					next_picture();
					break; //space
				case 39:
					next_picture();
					break; //right
				case 27:
					close_full_gallery();
					break; //esc
			}
		}
	});
});