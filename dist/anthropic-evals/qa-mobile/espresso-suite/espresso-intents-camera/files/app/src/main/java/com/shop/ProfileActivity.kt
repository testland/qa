// take_photo: requests CAMERA permission, then
// startActivityForResult(Intent(MediaStore.ACTION_IMAGE_CAPTURE), REQ)
// onActivityResult: val bmp = data?.extras?.get("data") as? Bitmap ?: return; avatar.setImageBitmap(bmp)
