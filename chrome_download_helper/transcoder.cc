#include <sstream>
#include <iostream>

#include "transcoder.h"


//libav
extern "C" {
#include "libavformat/avformat.h"
#include "libavcodec/avcodec.h"
#include "libavutil/mathematics.h"
}

using namespace std;

Transcoder* Transcoder::Create(pp::Instance* instance, 
			       const string& url, 
			       const string& conversionType,
			       const string& vidID) {
  return new Transcoder(instance, url, conversionType, vidID);
}

//constructor
Transcoder::Transcoder(pp::Instance* instance, 
		       const string& url, 
		       const string& conversionType,
		       const string& vidID)
  : instance_(instance),
    url_(url),
    vidID_(vidID),
    conversionType_(conversionType),
    url_request_(instance),
    url_loader_(instance),
    buffer_(new char[READ_BUFFER_SIZE]),
    cc_factory_(this) {
  url_request_.SetURL(url);
  url_request_.SetMethod("GET");
  url_request_.SetRecordDownloadProgress(true);
}

Transcoder::~Transcoder() {
  delete [] buffer_;
  delete [] encodingBuffer;
  buffer_ = NULL;
  encodingBuffer = NULL;
}

void Transcoder::Start() {
  pp::CompletionCallback cc = cc_factory_.NewCallback(&Transcoder::OnOpen);
  url_loader_.Open(url_request_, cc);
}

void Transcoder::OnOpen(int32_t result) {
  if (result != PP_OK) {
    Die(totalBuffer, false);
    return;
  }
  
  //reserve memory for downloaded content
  int64_t bytes_received = 0;
  int64_t total_bytes_to_be_received = 0;
  url_loader_.GetDownloadProgress(&bytes_received, &total_bytes_to_be_received);
  url_request_.SetRecordDownloadProgress(true);
  ReadBody();
}

void Transcoder::OnRead(int32_t result) {
  if (result == PP_OK) {
    //reclaim memory
    delete[] buffer_;
    buffer_ = NULL;
    Die(totalBuffer, true);
  } else if (result > 0) {
    AppendDataBytes(buffer_, result);
    ReadBody();
  } else {
    Die(totalBuffer, false);
  }
}

void Transcoder::AppendDataBytes(const char* buffer, int32_t num_bytes) {
  if (num_bytes <= 0) return;
  
  num_bytes = std::min(READ_BUFFER_SIZE, num_bytes);
  
  for (int index = 0 ; index < num_bytes ; index++) {
    totalBuffer.push_back(buffer[index]);
  }
}


void Transcoder::ReadBody() {
  pp::CompletionCallback cc = cc_factory_.NewOptionalCallback(&Transcoder::OnRead);
  int32_t result = PP_OK;
  
  do {
    result = url_loader_.ReadResponseBody(buffer_, READ_BUFFER_SIZE, cc);
    //debugging
    pp::VarArrayBuffer testBuf(15);
    //test if map/unmap works
    testBuf.Unmap();
    testBuf.Map();
    char* test_buf = static_cast<char*>(testBuf.Map());
    const uint32_t testByteLength = testBuf.ByteLength();
    for (size_t bufIndex = 0; bufIndex < testByteLength; bufIndex++) {
      //put bytes in the mapped array buffer
    }
    
    /*
    pp::Var bufferSize((int32_t)strlen(buffer_));
    instance_->PostMessage(bufferSize);
    pp::Var buf(buffer_);
    */
    /*
    if(buf.is_array_buffer()) {
      pp::Var debugMsg("It's an array buffer");
      instance_->PostMessage(debugMsg);
    } else {
      pp::Var debugMsg("It's NOT an array buffer");
      instance_->PostMessage(debugMsg);
    }
    */
    //pp::VarArrayBuffer transcodeBuffer(buf);
    //debug
    /*
    if(transcodeBuffer.is_array_buffer()) {
      pp::Var debugMsg("It's an array buffer");
      instance_->PostMessage(debugMsg);
    } else {
      pp::Var debugMsg("It's NOT an array buffer");
      instance_->PostMessage(debugMsg);
    }
    */
    if (result > 0) {
      AppendDataBytes(buffer_, result);
      //progress tracking
      int64_t bytes_received = 0;
      int64_t total_bytes_to_be_received = 0;
      url_loader_.GetDownloadProgress(&bytes_received, &total_bytes_to_be_received);
      int64_t totalBytes = bytes_received + total_bytes_to_be_received;
      if (totalBytes != 0) {
	double percentage = (double)((bytes_received * 100) / total_bytes_to_be_received);
	ostringstream strs;
	strs << percentage;
	string percentageStr = strs.str();
	string progressReport("progress---->");
	progressReport.append(vidID_);
	progressReport.append("---->");
	progressReport.append(percentageStr);
	pp::Var progressReportBack(progressReport);
	instance_->PostMessage(progressReportBack);
      }
    }
  } while (result > 0);
  
  //completion pending
  if (result != PP_OK_COMPLETIONPENDING) {
    cc.Run(result);
  }
  
}

void Transcoder::FinalReport(BUFFER buffer, bool success) {
  if (!success) {
    printf("Error!");
  } else {
    
    encodingBuffer = new char[buffer.size()];
    
    //collect data through the char vector buffer
    int increment = 0;
    for (vector<char>::iterator it = buffer.begin(); it != buffer.end(); it++) {
      encodingBuffer[increment] = *it;
      increment++;
    }
    
    string progressReport("progress---->");
    progressReport.append(vidID_);
    progressReport.append("---->100");
    pp::Var progressReportBack(progressReport);
    instance_->PostMessage(progressReportBack);
    
  }
}

void Transcoder::Die(BUFFER buffer, bool success) {
  FinalReport(buffer, success);
  delete this;
}
