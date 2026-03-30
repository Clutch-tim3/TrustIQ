export const isValidIp = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

export const isDatacenterIp = async (ip: string, asn?: string, isp?: string): Promise<boolean> => {
  const datacenterPatterns = [
    /aws|amazon|ec2|cloudfront/i,
    /google.*cloud|gcp|compute.*engine/i,
    /microsoft.*azure|azure.*compute/i,
    /digitalocean|do.*droplet/i,
    /vultr|linode|hetzner/i,
    /rackspace|softlayer|ibm.*cloud/i
  ];

  return datacenterPatterns.some(pattern => 
    (asn && pattern.test(asn)) || (isp && pattern.test(isp))
  );
};
