module trustops::trust_certificate {
    use sui::object::UID;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::string::{Self, String};
    use sui::event;
    use sui::coin::Coin;

    /// Treasury address for collecting fees
    const TREASURY: address = @0x319b22babb64339f17a550c978fe3c1bc8c37c825681744145b408f45e946ae1;
    
    /// Minting fee: 1 USDS (6 decimals = 1,000,000)
    const MINT_FEE: u64 = 1000000;
    
    /// Error codes
    const E_INSUFFICIENT_PAYMENT: u64 = 1;

    /// Trust Certificate NFT with display metadata
    public struct TrustCertificate has key, store {
        id: UID,
        validation_id: String,
        trust_score: u8,
        ipfs_cid: String,
        prompt: String,
        timestamp: u64,
        image_url: String,
        owner: address,
    }

    /// Event emitted when certificate is minted
    public struct CertificateMinted has copy, drop {
        certificate_id: address,
        validation_id: String,
        trust_score: u8,
        recipient: address,
        fee_paid: u64,
    }

    /// One-time witness for display
    public struct TRUST_CERTIFICATE has drop {}

    /// Initialize with display standard
    fun init(otw: TRUST_CERTIFICATE, ctx: &mut TxContext) {
        use sui::package;
        use sui::display;

        let publisher = package::claim(otw, ctx);
        
        let mut display = display::new<TrustCertificate>(&publisher, ctx);
        
        // Set display fields for NFT explorers
        display::add(&mut display, std::string::utf8(b"name"), std::string::utf8(b"Trust Ops Certificate #{validation_id}"));
        display::add(&mut display, std::string::utf8(b"description"), std::string::utf8(b"Decentralized AI validation certificate with trust score: {trust_score}/100"));
        display::add(&mut display, std::string::utf8(b"image_url"), std::string::utf8(b"{image_url}"));
        display::add(&mut display, std::string::utf8(b"project_url"), std::string::utf8(b"https://trustops.app"));
        display::add(&mut display, std::string::utf8(b"creator"), std::string::utf8(b"Trust Ops Protocol"));
        
        display::update_version(&mut display);
        
        transfer::public_transfer(publisher, sui::tx_context::sender(ctx));
        transfer::public_transfer(display, sui::tx_context::sender(ctx));
    }

    /// Mint with payment (accepts any coin type - use USDC/USDS for production)
    public fun mint_certificate<T>(
        payment: Coin<T>,
        validation_id: vector<u8>,
        trust_score: u8,
        ipfs_cid: vector<u8>,
        prompt: vector<u8>,
        timestamp: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Verify payment amount
        assert!(sui::coin::value(&payment) >= MINT_FEE, E_INSUFFICIENT_PAYMENT);
        
        // Send payment to treasury
        transfer::public_transfer(payment, TREASURY);

        // Create image URL
        let validation_id_str = string::utf8(validation_id);
        let base_url = b"http://localhost:3000/api/nft-image/";
        let mut image_url_bytes = vector::empty<u8>();
        vector::append(&mut image_url_bytes, base_url);
        vector::append(&mut image_url_bytes, validation_id);
        let image_url = string::utf8(image_url_bytes);
        
        // Mint NFT
        let certificate = TrustCertificate {
            id: sui::object::new(ctx),
            validation_id: validation_id_str,
            trust_score,
            ipfs_cid: string::utf8(ipfs_cid),
            prompt: string::utf8(prompt),
            timestamp,
            image_url,
            owner: recipient,
        };

        let certificate_id = sui::object::uid_to_address(&certificate.id);

        event::emit(CertificateMinted {
            certificate_id,
            validation_id: certificate.validation_id,
            trust_score: certificate.trust_score,
            recipient,
            fee_paid: MINT_FEE,
        });

        transfer::public_transfer(certificate, recipient);
    }

    /// View functions
    public fun get_trust_score(certificate: &TrustCertificate): u8 {
        certificate.trust_score
    }

    public fun get_validation_id(certificate: &TrustCertificate): String {
        certificate.validation_id
    }

    public fun get_image_url(certificate: &TrustCertificate): String {
        certificate.image_url
    }
}
