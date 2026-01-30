// trust_ops_agent.move
module trustops::validation {
    use sui::object::{UID, ID};
    use sui::tx_context::TxContext;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};

    // Error codes
    const E_WORKER_NOT_FOUND: u64 = 2;
    const E_VALIDATION_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_WORKERS: u64 = 4;
    const E_UNAUTHORIZED: u64 = 5;

    // Main validation registry
    public struct ValidationRegistry has key {
        id: UID,
        owner: address,
        workers: Table<address, Worker>,
        validations: Table<ID, ValidationRecord>,
        total_validations: u64,
    }

    // Worker metadata
    public struct Worker has store {
        address: address,
        reputation_score: u64,
        total_inferences: u64,
        successful_validations: u64,
        is_active: bool,
    }

    // Validation record
    public struct ValidationRecord has key, store {
        id: UID,
        requester: address,
        prompt: String,
        timestamp: u64,
        worker_responses: vector<WorkerResponse>,
        trust_score: u64,
        consensus_reached: bool,
        evidence_bundle_cid: String,
    }

    // Worker response
    public struct WorkerResponse has store, copy, drop {
        worker: address,
        response_hash: vector<u8>,
        response_text: String,
        inference_time_ms: u64,
        similarity_score: u64,
    }

    // Evidence bundle
    public struct EvidenceBundle has key, store {
        id: UID,
        validation_id: ID,
        responses: vector<WorkerResponse>,
        trust_score: u64,
        semantic_similarity_matrix: vector<u64>,
        outlier_flags: vector<bool>,
        ipfs_cid: String,
        timestamp: u64,
    }

    // Trust certificate NFT
    public struct TrustCertificate has key, store {
        id: UID,
        validation_id: ID,
        trust_score: u64,
        issuer: address,
        timestamp: u64,
    }

    // Events
    public struct ValidationRequested has copy, drop {
        validation_id: ID,
        requester: address,
        prompt: String,
        timestamp: u64,
    }

    public struct ValidationCompleted has copy, drop {
        validation_id: ID,
        trust_score: u64,
        consensus_reached: bool,
        worker_count: u64,
    }

    public struct WorkerRegistered has copy, drop {
        worker: address,
        timestamp: u64,
    }

    public struct EvidenceBundleCreated has copy, drop {
        bundle_id: ID,
        validation_id: ID,
        ipfs_cid: String,
    }

    // Initialize
    fun init(ctx: &mut TxContext) {
        let registry = ValidationRegistry {
            id: object::new(ctx),
            owner: ctx.sender(),
            workers: table::new(ctx),
            validations: table::new(ctx),
            total_validations: 0,
        };
        transfer::share_object(registry);
    }

    // Register worker
    public fun register_worker(
        registry: &mut ValidationRegistry,
        ctx: &mut TxContext
    ) {
        let worker_address = ctx.sender();
        assert!(!table::contains(&registry.workers, worker_address), E_UNAUTHORIZED);

        let worker = Worker {
            address: worker_address,
            reputation_score: 100,
            total_inferences: 0,
            successful_validations: 0,
            is_active: true,
        };

        table::add(&mut registry.workers, worker_address, worker);

        event::emit(WorkerRegistered {
            worker: worker_address,
            timestamp: 0,
        });
    }

    // Request validation
    public fun request_validation(
        registry: &mut ValidationRegistry,
        prompt: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let validation_id = object::new(ctx);
        let id_copy = object::uid_to_inner(&validation_id);

        let validation = ValidationRecord {
            id: validation_id,
            requester: ctx.sender(),
            prompt,
            timestamp: clock::timestamp_ms(clock),
            worker_responses: vector::empty(),
            trust_score: 0,
            consensus_reached: false,
            evidence_bundle_cid: string::utf8(b""),
        };

        event::emit(ValidationRequested {
            validation_id: id_copy,
            requester: ctx.sender(),
            prompt: validation.prompt,
            timestamp: validation.timestamp,
        });

        table::add(&mut registry.validations, id_copy, validation);
        registry.total_validations = registry.total_validations + 1;

        id_copy
    }

    // Submit inference
    public fun submit_inference(
        registry: &mut ValidationRegistry,
        validation_id: ID,
        response_text: String,
        response_hash: vector<u8>,
        inference_time_ms: u64,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.validations, validation_id), E_VALIDATION_NOT_FOUND);
        let worker_address = ctx.sender();
        assert!(table::contains(&registry.workers, worker_address), E_WORKER_NOT_FOUND);

        let validation = table::borrow_mut(&mut registry.validations, validation_id);
        
        let response = WorkerResponse {
            worker: worker_address,
            response_hash,
            response_text,
            inference_time_ms,
            similarity_score: 0,
        };

        vector::push_back(&mut validation.worker_responses, response);

        let worker = table::borrow_mut(&mut registry.workers, worker_address);
        worker.total_inferences = worker.total_inferences + 1;
    }

    // Compute trust score
    public fun compute_trust_score(
        registry: &mut ValidationRegistry,
        validation_id: ID,
        similarity_scores: vector<u64>,
        outlier_flags: vector<bool>,
        _ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.validations, validation_id), E_VALIDATION_NOT_FOUND);
        let validation = table::borrow_mut(&mut registry.validations, validation_id);

        let response_count = vector::length(&validation.worker_responses);
        assert!(response_count >= 3, E_INSUFFICIENT_WORKERS);

        let mut i = 0;
        while (i < response_count) {
            let response = vector::borrow_mut(&mut validation.worker_responses, i);
            response.similarity_score = *vector::borrow(&similarity_scores, i);
            i = i + 1;
        };

        let trust_score = calculate_weighted_trust_score(
            &similarity_scores,
            &outlier_flags,
            response_count
        );

        validation.trust_score = trust_score;
        validation.consensus_reached = trust_score >= 70;

        event::emit(ValidationCompleted {
            validation_id,
            trust_score,
            consensus_reached: validation.consensus_reached,
            worker_count: response_count,
        });
    }

    fun calculate_weighted_trust_score(
        similarity_scores: &vector<u64>,
        outlier_flags: &vector<bool>,
        count: u64
    ): u64 {
        let mut total_score = 0u64;
        let mut valid_count = 0u64;
        let mut i = 0;

        while (i < count) {
            if (!*vector::borrow(outlier_flags, i)) {
                total_score = total_score + *vector::borrow(similarity_scores, i);
                valid_count = valid_count + 1;
            };
            i = i + 1;
        };

        if (valid_count == 0) {
            return 0
        };

        let avg_score = total_score / valid_count;
        let consensus_bonus = if (valid_count >= (count * 2 / 3)) { 10 } else { 0 };
        
        let final_score = avg_score + consensus_bonus;
        if (final_score > 100) { 100 } else { final_score }
    }

    // Create evidence bundle
    public fun create_evidence_bundle(
        registry: &mut ValidationRegistry,
        validation_id: ID,
        ipfs_cid: String,
        semantic_matrix: vector<u64>,
        outlier_flags: vector<bool>,
        clock: &Clock,
        ctx: &mut TxContext
    ): EvidenceBundle {
        assert!(table::contains(&registry.validations, validation_id), E_VALIDATION_NOT_FOUND);
        let validation = table::borrow_mut(&mut registry.validations, validation_id);
        
        validation.evidence_bundle_cid = ipfs_cid;

        let bundle = EvidenceBundle {
            id: object::new(ctx),
            validation_id,
            responses: validation.worker_responses,
            trust_score: validation.trust_score,
            semantic_similarity_matrix: semantic_matrix,
            outlier_flags,
            ipfs_cid: validation.evidence_bundle_cid,
            timestamp: clock::timestamp_ms(clock),
        };

        event::emit(EvidenceBundleCreated {
            bundle_id: object::uid_to_inner(&bundle.id),
            validation_id,
            ipfs_cid: validation.evidence_bundle_cid,
        });

        bundle
    }

    // Issue trust certificate
    public fun issue_trust_certificate(
        registry: &ValidationRegistry,
        validation_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ): TrustCertificate {
        assert!(table::contains(&registry.validations, validation_id), E_VALIDATION_NOT_FOUND);
        let validation = table::borrow(&registry.validations, validation_id);

        TrustCertificate {
            id: object::new(ctx),
            validation_id,
            trust_score: validation.trust_score,
            issuer: registry.owner,
            timestamp: clock::timestamp_ms(clock),
        }
    }

    // Transfer functions
    public fun transfer_evidence_bundle(
        bundle: EvidenceBundle,
        recipient: address
    ) {
        transfer::public_transfer(bundle, recipient);
    }

    public fun transfer_trust_certificate(
        certificate: TrustCertificate,
        recipient: address
    ) {
        transfer::public_transfer(certificate, recipient);
    }
}