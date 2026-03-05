"""
Logging Configuration

Centralized logging setup for the application
"""
import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
 
    # Setup application logging
    # Args:
    #     level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    # Returns:
    #     Logger instance

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Return app logger
    logger = logging.getLogger("evalai")
    logger.info("Logging configured successfully")
    
    return logger