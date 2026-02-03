package com.voxintelligence.pro

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import java.io.File
import java.io.FileOutputStream
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    handleIntent(intent)
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onNewIntent(intent: Intent) {
    handleIntent(intent)
    super.onNewIntent(intent)
  }

  private fun handleIntent(intent: Intent) {
    val action = intent.action
    val type = intent.type

    if (Intent.ACTION_SEND == action && type != null) {
      if (type.startsWith("audio/")) {
        val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        uri?.let {
          val file = resolveContentUriToFile(it)
          if (file != null) {
              intent.action = Intent.ACTION_VIEW
              intent.data = Uri.fromFile(file)
          }
        }
      }
    }
  }

  private fun resolveContentUriToFile(uri: Uri): File? {
      try {
          val inputStream = contentResolver.openInputStream(uri) ?: return null
          
          val mimeType = contentResolver.getType(uri)
          val ext = if (mimeType != null) {
              MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "bin"
          } else {
              "bin"
          }
          
          val tempFile = File(cacheDir, "shared_voice_" + System.currentTimeMillis() + "." + ext)
          val outputStream = FileOutputStream(tempFile)
          
          inputStream.use { input ->
              outputStream.use { output ->
                  input.copyTo(output)
              }
          }
          return tempFile
      } catch (e: Exception) {
          e.printStackTrace()
          return null
      }
  }
}
