pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend/auth-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }

                dir('backend/user-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }

                dir('backend/attendance-service') {
                    sh 'chmod +x mvnw'
                    sh './mvnw test'
                }
            }
        }

        stage('Docker Compose Build') {
            steps {
                echo 'Building Docker images...'
                sh 'docker compose -f docker-compose.prod.yml build'
            }
        }

        stage('Trivy Security Scan') {
            steps {
                script {
                    List<String> services = [
                        'auth-service',
                        'user-service',
                        'attendance-service',
                        'frontend'
                    ]

                    def vulnerableServices = []

                    for (service in services) {
                        echo "Scanning ${service}..."

                        def result = sh(
                            script: """
                                    docker run --rm \
                                    -v /var/run/docker.sock:/var/run/docker.sock \
                                    -v trivy-cache:/root/.cache/ \
                                    aquasec/trivy image \
                                    --severity CRITICAL,HIGH \
                                    --exit-code 0 \
                                    attendance-platform-cicd-${service}:latest
                                """,
                            returnStdout: true
                        ).trim()

                        echo result

                        if (result.contains('CRITICAL')) {
                            vulnerableServices.add(service)
                        }
                    }

                    if (vulnerableServices.size() > 0) {
                        def servicesList = vulnerableServices.join('\\n- ')

                        sh """
                        curl -H "Content-Type: application/json" \
                        -X POST \
                        --data \
                        '{ "text":"🚨 Trivy detected CRITICAL vulnerabilities!\\n\\nAffected services:\\n- ${servicesList}\\n\\nBuild: ${BUILD_URL}" }' \
                        https://hooks.slack.com/services/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
                        """
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    file(credentialsId: 'attendance-env-prod', variable: 'ENV_FILE')
                ]) {
                    echo 'Deploying application...'

                    sh 'cp $ENV_FILE .env.prod'

                    sh 'docker compose -f docker-compose.prod.yml down'
                    sh 'docker compose -f docker-compose.prod.yml up -d'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
            sh """
            curl -X POST \
            -H 'Content-type: application/json' \
            --data \
            '{ "text":"✅ Deployment succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}" }' \
            https://hooks.slack.com/services/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
            """
        }

        failure {
            echo 'Pipeline failed!'
            sh """
            curl -X POST \
            -H 'Content-type: application/json' \
            --data \
            '{ "text":"❌ Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}" }' \
            https://hooks.slack.com/services/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
            """
        }
    }
}
