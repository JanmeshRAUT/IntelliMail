"""Feature extraction utilities for URL phishing detection."""

from urllib.parse import urlparse
from typing import Dict, List

SUSPICIOUS_KEYWORDS = ["login", "verify", "secure", "bank", "account"]

def extract_domain_from_url(url: str) -> str:
    """Extract domain from URL"""
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        parsed = urlparse(url)
        return parsed.netloc
    except Exception:
        return ''

def extract_features(url: str) -> Dict[str, float]:
    """
    Extract features from a URL for phishing detection
    
    Features extracted:
    - url_length
    - dot_count
    - subdomain_count
    - has_at_symbol
    - has_dash
    - has_https
    - digit_count
    - suspicious_keyword_count
    
    Returns:
        Dictionary of feature names to feature values
    """
    features: Dict[str, float] = {}
    
    try:
        # Basic URL validation and normalization
        if not url:
            return {
                "url_length": 0,
                "dot_count": 0,
                "subdomain_count": 0,
                "has_at_symbol": 0,
                "has_dash": 0,
                "has_https": 0,
                "digit_count": 0,
                "suspicious_keyword_count": 0,
            }
        
        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        
        # Parse URL
        parsed = urlparse(url)
        
        features["url_length"] = len(url)
        
        features["dot_count"] = url.count(".")
        
        domain = parsed.netloc
        subdomain_count = domain.count(".") - 1
        if subdomain_count < 0:
            subdomain_count = 0
        features["subdomain_count"] = subdomain_count
        
        features["has_at_symbol"] = 1 if "@" in url else 0
        
        features["has_dash"] = 1 if "-" in url else 0
        
        features["has_https"] = 1 if url.startswith("https://") else 0
        
        features["digit_count"] = sum(1 for c in url if c.isdigit())

        url_lower = url.lower()
        suspicious_count = sum(1 for keyword in SUSPICIOUS_KEYWORDS if keyword in url_lower)
        features["suspicious_keyword_count"] = suspicious_count
        
    except Exception as e:
        print(f"Error extracting features from URL: {url}, Error: {str(e)}")
        # Return default features on error
        return {
            "url_length": 0,
            "dot_count": 0,
            "subdomain_count": 0,
            "has_at_symbol": 0,
            "has_dash": 0,
            "has_https": 0,
            "digit_count": 0,
            "suspicious_keyword_count": 0,
        }
    
    return features

def extract_features_batch(urls: List[str]) -> List[Dict[str, float]]:
    """
    Extract features from multiple URLs
    
    Args:
        urls: List of URLs
        
    Returns:
        List of feature dictionaries
    """
    return [extract_features(url) for url in urls]

def features_to_list(features: Dict[str, float], feature_order: List[str] = None) -> List[float]:
    """
    Convert feature dictionary to ordered list
    
    Args:
        features: Feature dictionary
        feature_order: Ordered list of feature names
        
    Returns:
        Ordered list of feature values
    """
    if feature_order is None:
        feature_order = [
            "url_length",
            "dot_count",
            "subdomain_count",
            "has_at_symbol",
            "has_dash",
            "has_https",
            "digit_count",
            "suspicious_keyword_count",
        ]
    
    return [features.get(feature, 0) for feature in feature_order]

def get_feature_names() -> List[str]:
    """Get ordered list of feature names"""
    return [
        "url_length",
        "dot_count",
        "subdomain_count",
        "has_at_symbol",
        "has_dash",
        "has_https",
        "digit_count",
        "suspicious_keyword_count",
    ]
