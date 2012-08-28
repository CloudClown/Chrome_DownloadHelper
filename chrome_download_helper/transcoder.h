#ifndef TRANSCODER_H
#define TRANSCODER_H

//c++ utils
#include <string>
#include <cstring>
#include <stdio.h>
#include <stdlib.h>

//ppapi
#include "ppapi/c/pp_errors.h"
#include "ppapi/c/ppb_instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include "ppapi/cpp/completion_callback.h"
#include "ppapi/cpp/url_loader.h"
#include "ppapi/cpp/url_request_info.h"
#include "ppapi/cpp/instance.h"
#include "ppapi/utility/completion_callback_factory.h"

//macros
#define READ_BUFFER_SIZE 1024

class Transcoder {
 public:
  static Transcoder* Create(pp::Instance* instance, 
			    const std::string& url, 
			    const std::string& conversionType,
			    const std::string& vidID);
  //start fetching content
  void Start();
  
 private:
  //constructor, securely triggered by Create()
  Transcoder(pp::Instance* instance, 
	     const std::string& url, 
	     const std::string& conversionType,
	     const std::string& vidID);
  //destructor
  ~Transcoder();
  
  //callbacks
  void OnOpen(int32_t result);
  void OnRead(int32_t result);
  void ReadBody();
  void AppendDataBytes(const char* buffer, int32_t num_bytes);
  void finishDataRead(const std::string& fname,
		      char* buffer, bool success);
  //weak pointer to the NACL module instance
  pp::Instance *instace_;
  
  std::string url_;
  std::string vidID_;
  std::string conversionType_;
  
  char* buffer_;
  
  //url loading
  pp::URLRequestInfo url_request_;
  pp::URLLoader url_loader_;
  
  pp::CompletionCallbackFactory<Transcoder> cc_factory_;
}

#endif
