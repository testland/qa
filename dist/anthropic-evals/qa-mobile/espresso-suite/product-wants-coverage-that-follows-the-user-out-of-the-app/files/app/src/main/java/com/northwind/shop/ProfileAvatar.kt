package com.northwind.shop

import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment

class ProfileAvatar(private val fragment: Fragment, private val profile: ProfileStore) {

    private lateinit var picker: ActivityResultLauncher<String>

    fun register() {
        picker = fragment.registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) onAvatarPicked(uri)
        }
    }

    fun launch() {
        picker.launch("image/*")
    }

    fun onAvatarPicked(uri: Uri) {
        profile.setAvatar(uri)
        fragment.requireView().findViewById<android.widget.ImageView>(R.id.avatar_image)
            .setImageURI(uri)
    }
}
