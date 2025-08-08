"""
Logger Configuration - Structured logging for the recommendation service
"""

import logging
import logging.config
import os
import sys
from datetime import datetime
from typing import Optional

def setup_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Set up structured logging for the application
    
    Args:
        name: Logger name (usually __name__)
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Configured logger instance
    """
    
    # Determine log level
    log_level = level or os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Log file path
    log_file = os.path.join(log_dir, f'recommendation_service_{datetime.now().strftime("%Y%m%d")}.log')
    
    # Logging configuration
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'detailed': {
                'format': '%(asctime)s | %(name)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '%(levelname)s | %(message)s'
            },
            'json': {
                '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(name)s %(levelname)s %(funcName)s %(lineno)d %(message)s'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'DEBUG',
                'formatter': 'detailed',
                'stream': sys.stdout
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'filename': log_file,
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filename': os.path.join(log_dir, f'errors_{datetime.now().strftime("%Y%m%d")}.log'),
                'maxBytes': 5242880,  # 5MB
                'backupCount': 3
            }
        },
        'loggers': {
            '': {  # Root logger
                'handlers': ['console', 'file', 'error_file'],
                'level': log_level,
                'propagate': False
            },
            'recommendation_service': {
                'handlers': ['console', 'file', 'error_file'],
                'level': log_level,
                'propagate': False
            },
            'uvicorn': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False
            },
            'uvicorn.error': {
                'handlers': ['console', 'error_file'],
                'level': 'INFO',
                'propagate': False
            },
            'uvicorn.access': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False
            }
        }
    }
    
    # Apply logging configuration
    try:
        logging.config.dictConfig(logging_config)
    except Exception as e:
        # Fallback to basic configuration if advanced config fails
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s | %(name)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(log_file)
            ]
        )
        print(f"Warning: Advanced logging configuration failed, using basic config: {e}")
    
    # Get logger instance
    logger = logging.getLogger(name)
    
    # Log startup message
    logger.info(f"📝 Logger initialized: {name} (Level: {log_level})")
    
    return logger

class StructuredLogger:
    """
    Wrapper for structured logging with additional context
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self.context = {}
    
    def add_context(self, **kwargs):
        """Add context to all subsequent log messages"""
        self.context.update(kwargs)
        return self
    
    def clear_context(self):
        """Clear all context"""
        self.context.clear()
        return self
    
    def _format_message(self, message: str, **kwargs) -> str:
        """Format message with context"""
        all_context = {**self.context, **kwargs}
        if all_context:
            context_str = " | ".join([f"{k}={v}" for k, v in all_context.items()])
            return f"{message} | {context_str}"
        return message
    
    def debug(self, message: str, **kwargs):
        """Log debug message with context"""
        self.logger.debug(self._format_message(message, **kwargs))
    
    def info(self, message: str, **kwargs):
        """Log info message with context"""
        self.logger.info(self._format_message(message, **kwargs))
    
    def warning(self, message: str, **kwargs):
        """Log warning message with context"""
        self.logger.warning(self._format_message(message, **kwargs))
    
    def error(self, message: str, **kwargs):
        """Log error message with context"""
        self.logger.error(self._format_message(message, **kwargs))
    
    def critical(self, message: str, **kwargs):
        """Log critical message with context"""
        self.logger.critical(self._format_message(message, **kwargs))

class PerformanceLogger:
    """
    Logger for performance metrics and timing
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_timing(self, operation: str, duration: float, **context):
        """Log timing information"""
        self.logger.info(
            f"⏱️ {operation} completed in {duration:.3f}s",
            extra={
                'operation': operation,
                'duration': duration,
                'performance_metric': True,
                **context
            }
        )
    
    def log_throughput(self, operation: str, items_processed: int, duration: float, **context):
        """Log throughput metrics"""
        throughput = items_processed / duration if duration > 0 else 0
        self.logger.info(
            f"📊 {operation}: {items_processed} items in {duration:.3f}s ({throughput:.2f} items/s)",
            extra={
                'operation': operation,
                'items_processed': items_processed,
                'duration': duration,
                'throughput': throughput,
                'performance_metric': True,
                **context
            }
        )
    
    def log_memory_usage(self, operation: str, memory_mb: float, **context):
        """Log memory usage"""
        self.logger.info(
            f"💾 {operation} memory usage: {memory_mb:.2f} MB",
            extra={
                'operation': operation,
                'memory_mb': memory_mb,
                'performance_metric': True,
                **context
            }
        )

class RecommendationLogger:
    """
    Specialized logger for recommendation system events
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self.structured = StructuredLogger(logger)
        self.performance = PerformanceLogger(logger)
    
    def log_recommendation_request(self, user_id: str, recommendation_type: str, **context):
        """Log recommendation request"""
        self.structured.info(
            f"🎯 Recommendation request: {recommendation_type}",
            user_id=user_id,
            recommendation_type=recommendation_type,
            **context
        )
    
    def log_recommendation_response(self, user_id: str, recommendation_type: str, 
                                  count: int, duration: float, **context):
        """Log recommendation response"""
        self.structured.info(
            f"✅ Recommendation response: {count} items in {duration:.3f}s",
            user_id=user_id,
            recommendation_type=recommendation_type,
            count=count,
            duration=duration,
            **context
        )
    
    def log_embedding_generation(self, book_id: str, duration: float, dimension: int, **context):
        """Log embedding generation"""
        self.structured.info(
            f"🧠 Embedding generated: {dimension}D in {duration:.3f}s",
            book_id=book_id,
            duration=duration,
            dimension=dimension,
            **context
        )
    
    def log_similarity_calculation(self, count: int, duration: float, **context):
        """Log similarity calculation"""
        self.performance.log_throughput(
            "similarity_calculation",
            count,
            duration,
            **context
        )
    
    def log_cache_operation(self, operation: str, key: str, hit: bool = None, **context):
        """Log cache operations"""
        status = "HIT" if hit else "MISS" if hit is False else "SET"
        self.structured.debug(
            f"💾 Cache {operation}: {status}",
            operation=operation,
            key=key,
            hit=hit,
            **context
        )
    
    def log_error(self, operation: str, error: Exception, **context):
        """Log errors with context"""
        self.structured.error(
            f"❌ Error in {operation}: {str(error)}",
            operation=operation,
            error_type=type(error).__name__,
            error_message=str(error),
            **context
        )
    
    def log_model_load(self, model_name: str, duration: float, **context):
        """Log model loading"""
        self.structured.info(
            f"🤖 Model loaded: {model_name} in {duration:.3f}s",
            model_name=model_name,
            duration=duration,
            **context
        )

# Global logger instances
def get_logger(name: str) -> RecommendationLogger:
    """
    Get a recommendation logger instance
    
    Args:
        name: Logger name
        
    Returns:
        RecommendationLogger instance
    """
    base_logger = setup_logger(name)
    return RecommendationLogger(base_logger)

# Decorator for automatic timing logging
def log_timing(operation_name: str = None):
    """
    Decorator to automatically log function execution time
    
    Args:
        operation_name: Custom operation name (defaults to function name)
    """
    def decorator(func):
        import functools
        import time
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            logger = get_logger(func.__module__)
            op_name = operation_name or func.__name__
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.performance.log_timing(op_name, duration)
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.log_error(op_name, e, duration=duration)
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            logger = get_logger(func.__module__)
            op_name = operation_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.performance.log_timing(op_name, duration)
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.log_error(op_name, e, duration=duration)
                raise
        
        # Return appropriate wrapper based on function type
        if hasattr(func, '__code__') and 'await' in func.__code__.co_names:
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator