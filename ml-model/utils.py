"""
URL Feature Extraction Utilities
Extracts features from URLs for phishing detection model
"""

import re
from urllib.parse import urlparse
from typing import Dict, List

# Suspicious keywords commonly found in phishing URLs
SUSPICIOUS_KEYWORDS = [
    'login',
    'verify',
    'secure',
    'bank',
    'account',
    'confirm',
    'authenticate',
    'authorize',
    'credential',
    'password',
    'signin',
    'update',
    'validate',
]

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
    - url_length: Total length of URL
    - dot_count: Number of dots in URL
    - subdomain_count: Number of subdomains
    - at_count: Presence of '@' symbol
    - dash_count: Number of dashes
    - https_present: Is HTTPS protocol used
    - digit_count: Number of digits
    - slash_count: Number of slashes
    - suspicious_keyword_count: Count of suspicious keywords
    - domain_length: Length of domain name
    - path_length: Length of path
    - query_string_length: Length of query string
    
    Returns:
        Dictionary of feature names to feature values
    """
    features = {}
    
    try:
        # Basic URL validation and normalization
        if not url:
            return {
                'url_length': 0,
                'dot_count': 0,
                'subdomain_count': 0,
                'at_count': 0,
                'dash_count': 0,
                'https_present': 0,
                'digit_count': 0,
                'slash_count': 0,
                'suspicious_keyword_count': 0,
                'domain_length': 0,
                'path_length': 0,
                'query_string_length': 0,
                'suspicious_tld': 0,
                'ip_address_present': 0,
            }
        
        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        
        # Parse URL
        parsed = urlparse(url)
        
        # 1. URL Length
        features['url_length'] = len(url)
        
        # 2. Count dots
        features['dot_count'] = url.count('.')
        
        # 3. Count subdomains
        domain = parsed.netloc
        subdomain_count = domain.count('.') - 1
        if subdomain_count < 0:
            subdomain_count = 0
        features['subdomain_count'] = subdomain_count
        
        # 4. Presence of '@' (often used in phishing)
        features['at_count'] = url.count('@')
        
        # 5. Count dashes (often in suspicious domains)
        features['dash_count'] = url.count('-')
        
        # 6. HTTPS protocol
        features['https_present'] = 1 if url.startswith('https://') else 0
        
        # 7. Count digits
        features['digit_count'] = sum(1 for c in url if c.isdigit())
        
        # 8. Count slashes
        features['slash_count'] = url.count('/')
        
        # 9. Suspicious keywords
        url_lower = url.lower()
        suspicious_count = sum(1 for keyword in SUSPICIOUS_KEYWORDS if keyword in url_lower)
        features['suspicious_keyword_count'] = suspicious_count
        
        # 10. Domain length
        features['domain_length'] = len(domain)
        
        # 11. Path length
        features['path_length'] = len(parsed.path)
        
        # 12. Query string length
        features['query_string_length'] = len(parsed.query) if parsed.query else 0
        
        # 13. Suspicious TLD detection
        suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.tk']
        features['suspicious_tld'] = 1 if any(domain.endswith(tld) for tld in suspicious_tlds) else 0
        
        # 14. IP address as domain
        ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}'
        features['ip_address_present'] = 1 if re.match(ip_pattern, domain) else 0
        
    except Exception as e:
        print(f"Error extracting features from URL: {url}, Error: {str(e)}")
        # Return default features on error
        return {
            'url_length': 0,
            'dot_count': 0,
            'subdomain_count': 0,
            'at_count': 0,
            'dash_count': 0,
            'https_present': 0,
            'digit_count': 0,
            'slash_count': 0,
            'suspicious_keyword_count': 0,
            'domain_length': 0,
            'path_length': 0,
            'query_string_length': 0,
            'suspicious_tld': 0,
            'ip_address_present': 0,
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
            'url_length',
            'dot_count',
            'subdomain_count',
            'at_count',
            'dash_count',
            'https_present',
            'digit_count',
            'slash_count',
            'suspicious_keyword_count',
            'domain_length',
            'path_length',
            'query_string_length',
            'suspicious_tld',
            'ip_address_present',
        ]
    
    return [features.get(feature, 0) for feature in feature_order]

def get_feature_names() -> List[str]:
    """Get ordered list of feature names"""
    return [
        'url_length',
        'dot_count',
        'subdomain_count',
        'at_count',
        'dash_count',
        'https_present',
        'digit_count',
        'slash_count',
        'suspicious_keyword_count',
        'domain_length',
        'path_length',
        'query_string_length',
        'suspicious_tld',
        'ip_address_present',
    ]
